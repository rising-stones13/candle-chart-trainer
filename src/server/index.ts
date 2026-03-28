import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { getFirebaseAdmin } from './lib/firebase-admin.js';
import { getSecrets } from './lib/secrets.js';
import { Resend } from 'resend';

// .env 読み込み
dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// 開発環境は3005、本番環境は指定のポート（または3001）を使用
const isDev = process.env.NODE_ENV === 'development';
const PORT = isDev ? 3005 : (process.env.PORT || 3001);

// ミドルウェア
app.use(morgan('dev'));

// 1. Stripe Webhook (Must be before express.json() for raw body)
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];
    const webhookSecret = secrets['STRIPE_WEBHOOK_SECRET'];
    const resendApiKey = secrets['RESEND_API_KEY'];

    if (!stripeSecretKey || !webhookSecret || !resendApiKey) {
      return res.status(500).json({ error: 'Missing secrets' });
    }

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
          await stripe.customers.update(customerId, {
            name: customerEmail || undefined,
            metadata: { firebase_uid: userId }
          });

          const userRef = db.collection('users').doc(userId);
          const updateData: any = { isPremium: true, stripeCustomerId: customerId, cancelAtPeriodEnd: false };
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
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any).id;
        const snapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
            currentPeriodEnd: (subscription as any).current_period_end ?? null,
            isPremium: subscription.status === 'active' || subscription.status === 'past_due',
          });
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
            cancelAtPeriodEnd: false,
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

// 2. Body parsers for other routes
app.use(express.json());

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false,
}));
app.use(compression());
app.use(cors());

// --- API Endpoints ---

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { auth } = await getFirebaseAdmin();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;

    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'STRIPE_SECRET_KEY is missing' });
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-01-27.acacia' as any });

    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    if (customerId) {
      const activeSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });
      if (activeSubscriptions.data.length > 0) {
        return res.status(400).json({ 
          error: 'Already Subscribed', 
          message: '既に有効なサブスクリプションを持っています。' 
        });
      }
    }

    const baseUrl = secrets['VITE_APP_URL'] || req.headers.origin || 'http://localhost:3000';
    const priceId = secrets['VITE_STRIPE_PREMIUM_PRICE_ID'] || 'price_1TBIy458QC2YRyBj54t1E3t0';

    if (!priceId) {
      return res.status(500).json({ error: 'Price ID is missing' });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { userId, userEmail: userEmail || '' },
      customer: customerId || undefined,
      customer_email: customerId ? undefined : (userEmail || undefined),
    });
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('[create-checkout-session] ERROR:', error);
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
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    let customerId = userData?.stripeCustomerId;
    const userEmail = decodedToken.email;

    // もし Firestore に Customer ID がない場合、Stripe 側をメールアドレスで検索
    if (!customerId && userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
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
          stripeCustomerId: customerId, // 確実に更新
          currentPeriodEnd: (sub as any).current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end
        });
      } else {
        await userRef.update({ isPremium: false, stripeSubscriptionId: null });
      }
    }
    res.json({ message: 'Synced', customerId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { auth, db } = await getFirebaseAdmin();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const secrets = await getSecrets();
    const stripe = new Stripe(secrets['STRIPE_SECRET_KEY'], { apiVersion: '2025-01-27.acacia' as any });
    const resend = new Resend(secrets['RESEND_API_KEY']);

    const userRef = db.collection('users').doc(userId);
    const userData = (await userRef.get()).data();
    const subId = userData?.stripeSubscriptionId;
    const email = userData?.email;

    if (subId) {
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    }

    await userRef.update({ cancelAtPeriodEnd: true });

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
    const { confirmSubscriptionCancellation } = req.body;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { auth, db } = await getFirebaseAdmin();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const userRef = db.collection('users').doc(userId);
    const userData = (await userRef.get()).data();
    const subId = userData?.stripeSubscriptionId;

    if (userData?.isPremium && !confirmSubscriptionCancellation) {
      return res.status(400).json({ message: 'プレミアムプランの自動解除に対する同意が必要です。' });
    }

    if (subId) {
      const secrets = await getSecrets();
      const stripe = new Stripe(secrets['STRIPE_SECRET_KEY'], { apiVersion: '2025-01-27.acacia' as any });
      await stripe.subscriptions.cancel(subId).catch(() => {});
    }

    await userRef.delete();
    await auth.deleteUser(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 静的ファイルの配信（本番環境用）
const distPath = path.resolve(__dirname, '../../dist/client');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API Endpoint Not Found' });
  }
  // 本番環境のみ index.html を返す（開発時はViteが担当する）
  if (!isDev) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).send('Not Found in Dev Mode (Vite should handle this)');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Express Server running on port ${PORT} (Mode: ${process.env.NODE_ENV})`);
});
