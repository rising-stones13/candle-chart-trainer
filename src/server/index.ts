import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { getFirebaseAdmin } from '../lib/firebase-admin.js';
import { getSecrets } from '../lib/secrets.js';
import { Resend } from 'resend';

// .env 読み込み
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// IDXなどの環境でPORTが設定されている場合、Viteと競合するため開発環境では3001を優先する
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 3001) : 3001;

// ミドルウェア
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());

// --- Stripe Webhook ---
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];
    const webhookSecret = secrets['STRIPE_WEBHOOK_SECRET'];
    const resendApiKey = secrets['RESEND_API_KEY'];

    if (!stripeSecretKey || !webhookSecret || !resendApiKey) {
      return res.status(500).json({ error: 'Missing secrets' });
    }

    // 型エラー回避のため as any を使用するか、適切なバージョンを指定
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-01-27.acacia' as any });
    const resend = new Resend(resendApiKey);
    const { db } = await getFirebaseAdmin();

    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        const customerEmail = session.customer_details?.email;

        if (userId && typeof customerId === 'string') {
          const userRef = db.collection('users').doc(userId);
          const updateData: any = { isPremium: true, stripeCustomerId: customerId };
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            updateData.stripeSubscriptionId = subscription.id;
            updateData.currentPeriodEnd = (subscription as any).current_period_end;
          }
          await userRef.update(updateData);
          if (customerEmail) {
            await resend.emails.send({
              from: 'ChartTrade Trainer <noreply@resend.dev>',
              to: customerEmail,
              subject: 'プレミアムプランへの加入ありがとうございます',
              html: `<p>プレミアムプランが有効になりました。</p>`,
            });
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any).id;
        const snapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({
            isPremium: false,
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
          });
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// JSON 解析を有効化
app.use(express.json());

// --- API Endpoints ---

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { userId, userEmail } = req.body;
    const secrets = await getSecrets();
    const stripe = new Stripe(secrets['STRIPE_SECRET_KEY'], { apiVersion: '2025-01-27.acacia' as any });

    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: { name: 'プレミアムプラン' },
          unit_amount: 980,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing`,
      metadata: { userId, userEmail },
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
    });
    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sync-stripe-status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { auth, db } = await getFirebaseAdmin();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const secrets = await getSecrets();
    const stripe = new Stripe(secrets['STRIPE_SECRET_KEY'], { apiVersion: '2025-01-27.acacia' as any });

    const userRef = db.collection('users').doc(userId);
    const userData = (await userRef.get()).data();
    let customerId = userData?.stripeCustomerId;

    if (!customerId && userData?.email) {
      const customers = await stripe.customers.list({ email: userData.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        await userRef.update({ stripeCustomerId: customerId });
      }
    }

    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });
      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        await userRef.update({ 
          isPremium: true, 
          stripeSubscriptionId: sub.id, 
          currentPeriodEnd: (sub as any).current_period_end 
        });
      } else {
        await userRef.update({ isPremium: false, stripeSubscriptionId: null, currentPeriodEnd: null });
      }
    }
    res.json({ message: 'Synced' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const { db } = await getFirebaseAdmin();
    const secrets = await getSecrets();
    const stripe = new Stripe(secrets['STRIPE_SECRET_KEY'], { apiVersion: '2025-01-27.acacia' as any });
    const resend = new Resend(secrets['RESEND_API_KEY']);

    const userRef = db.collection('users').doc(userId);
    const userData = (await userRef.get()).data();
    const subId = userData?.stripeSubscriptionId;
    const custId = userData?.stripeCustomerId;
    const email = userData?.email;

    if (subId) await stripe.subscriptions.cancel(subId);
    if (custId) await stripe.customers.del(custId);

    await userRef.update({
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      isPremium: false,
    });

    if (email) {
      await resend.emails.send({
        from: 'ChartTrade Trainer <noreply@resend.dev>',
        to: email,
        subject: 'プレミアムプランの解約が完了しました',
        html: `<p>解約手続きが完了しました。ご利用ありがとうございました。</p>`,
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/delete-account', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const { auth, db } = await getFirebaseAdmin();
    await db.collection('users').doc(userId).delete();
    await auth.deleteUser(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/check-env', async (req, res) => {
  const secrets = await getSecrets();
  res.json({
    FIREBASE_PROJECT_ID: !!secrets.FIREBASE_PROJECT_ID,
    STRIPE_SECRET_KEY: !!secrets.STRIPE_SECRET_KEY,
    RESEND_API_KEY: !!secrets.RESEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });
});

const distPath = path.resolve(__dirname, '../../dist/client');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
