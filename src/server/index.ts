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
// IDXなどの環境でPORTが設定されている場合、Viteと競合するため開発環境では3001を優先する
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 3001) : 3005;

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
          // 顧客オブジェクトのメタデータを更新して後日特定可能にする
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

    console.log(`[create-checkout-session] Starting session for user: ${userId}, email: ${userEmail}`);
    
    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'STRIPE_SECRET_KEY is missing' });
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-01-27.acacia' as any });

    // 1. 既存顧客の検索
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // 2. 重複購入チェック (Task 1-2)
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
    console.log(`[create-checkout-session] Base URL: ${baseUrl}, Price ID: ${priceId}`);

    if (!priceId) {
      console.error('[create-checkout-session] Price ID is missing');
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
    console.log(`[create-checkout-session] Session created: ${session.id}`);
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
    if (!token) {
      console.warn('[sync-stripe-status] No token provided');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { auth, db } = await getFirebaseAdmin();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    console.log(`[sync-stripe-status] Syncing for user: ${userId}`);

    const secrets = await getSecrets();
    if (!secrets['STRIPE_SECRET_KEY']) {
      console.error('[sync-stripe-status] Missing STRIPE_SECRET_KEY');
      return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
    }
    
    const stripe = new Stripe(secrets['STRIPE_SECRET_KEY'], { apiVersion: '2025-01-27.acacia' as any });

    const userRef = db.collection('users').doc(userId);
    const userData = (await userRef.get()).data();
    let customerId = userData?.stripeCustomerId;

    if (!customerId && userData?.email) {
      console.log(`[sync-stripe-status] Looking up Stripe customer for email: ${userData.email}`);
      const customers = await stripe.customers.list({ email: userData.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        // メタデータを更新して後日特定可能にする
        await stripe.customers.update(customerId, {
          metadata: { firebase_uid: userId }
        });
        await userRef.update({ stripeCustomerId: customerId });
      }
    }

    if (customerId) {
      console.log(`[sync-stripe-status] Fetching and updating Stripe customer: ${customerId}`);
      // 既存顧客に対しても確実にメタデータを紐付ける
      await stripe.customers.update(customerId, {
        metadata: { firebase_uid: userId }
      }).catch(err => console.error('[sync-stripe-status] Failed to update customer metadata:', err));

      console.log(`[sync-stripe-status] Fetching subscriptions for customer: ${customerId}`);
      const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });
      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        await userRef.update({ 
          isPremium: true, 
          stripeSubscriptionId: sub.id, 
          currentPeriodEnd: (sub as any).current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end
        });
      } else {
        await userRef.update({ isPremium: false, stripeSubscriptionId: null, currentPeriodEnd: null });
      }
    }
    res.json({ message: 'Synced' });
  } catch (error: any) {
    console.error('[sync-stripe-status] CRITICAL ERROR:', error);
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
    const custId = userData?.stripeCustomerId;
    const email = userData?.email;

    if (subId) {
      // 即時キャンセルではなく「期間終了時に解約」を設定
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    }

    // 権限は維持し、解約予約フラグのみを立てる
    await userRef.update({
      cancelAtPeriodEnd: true,
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

    // プレミアムプランの場合のチェック
    if (userData?.isPremium && !confirmSubscriptionCancellation) {
      return res.status(400).json({ 
        message: 'プレミアムプランの自動解除に対する同意が必要です。' 
      });
    }

    // 退会時にサブスクリプションが残っている場合はキャンセル
    if (subId) {
      const secrets = await getSecrets();
      const stripe = new Stripe(secrets['STRIPE_SECRET_KEY'], { apiVersion: '2025-01-27.acacia' as any });
      try {
        await stripe.subscriptions.cancel(subId);
      } catch (e) {
        console.error('[delete-account] Failed to cancel subscription:', e);
      }
    }

    await userRef.delete();
    await auth.deleteUser(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/check-env', async (req, res) => {
  console.log('GET /api/check-env requested');
  const secrets = await getSecrets();
  res.json({
    FIREBASE_PROJECT_ID: !!secrets.FIREBASE_PROJECT_ID,
    STRIPE_SECRET_KEY: !!secrets.STRIPE_SECRET_KEY,
    RESEND_API_KEY: !!secrets.RESEND_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });
});

const distPath = path.resolve(__dirname, '../../dist/client');
console.log(`Static files path: ${distPath}`);
app.use(express.static(distPath));

app.get('*', (req, res) => {
  console.log(`GET * requested: ${req.path}`);
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found', path: req.path });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
