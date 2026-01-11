import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getSecrets } from '@/lib/secrets';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  let stripe: Stripe;
  let webhookSecret: string;
  let resend: Resend;

  try {
    const { db } = await getFirebaseAdmin();
    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];
    webhookSecret = secrets['STRIPE_WEBHOOK_SECRET'];
    const resendApiKey = secrets['RESEND_API_KEY'];

    if (!stripeSecretKey || !webhookSecret || !resendApiKey) {
      throw new Error('Required secrets (Stripe or Resend) not found in Secret Manager.');
    }

    stripe = new Stripe(stripeSecretKey, {
      // ▼▼▼ APIバージョンを整合性のあるものに修正 ▼▼▼
      apiVersion: '2023-10-16',
      // ▲▲▲ ここまで ▲▲▲
    });
    resend = new Resend(resendApiKey);

    const payload = await req.text();
    const sig = req.headers.get('stripe-signature')!;
    const event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);

    console.log(`✅ Success: Received event type: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // 以前の正常な実装通り、metadataからuserIdを取得
        const userId = session.metadata?.userId;
        const customerId = session.customer;
        const subscriptionIdFromSession = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        const customerEmail = session.customer_details?.email;

        if (!userId || !customerId || typeof customerId !== 'string') {
            throw new Error('Missing required metadata (userId or customerId) in checkout session.');
        }

        const userRef = db.collection('users').doc(userId);
        console.log(`Attempting to grant premium access for user ${userId}...`);

        const updateData: any = { isPremium: true, stripeCustomerId: customerId };

        if (subscriptionIdFromSession) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionIdFromSession);
            updateData.stripeSubscriptionId = subscription.id;
            updateData.currentPeriodEnd = subscription.current_period_end;
        }
        
        await userRef.update(updateData);
        console.log(`Successfully granted premium access to user ${userId}`);

        // メール送信
        if (customerEmail) {
            try {
                await resend.emails.send({
                    from: 'ChartTrade Trainer <noreply@resend.dev>', // 送信元
                    to: customerEmail,
                    subject: 'プレミアムプランへの加入ありがとうございます',
                    html: `
                        <p>ChartTrade Trainerのプレミアムプランをご購入いただき、誠にありがとうございます。</p>
                        <p>プレミアム機能が有効化されました。全てのチャート分析ツールとデモトレード機能をご活用いただけます。</p>
                        <p>今後ともChartTrade Trainerをよろしくお願いいたします。</p>
                        <p>ChartTrade Trainer 運営</p>
                    `,
                });
                console.log(`Welcome email sent to ${customerEmail}`);
            } catch (emailError) {
                console.error(`Failed to send welcome email to ${customerEmail}:`, emailError);
                // メール送信失敗はメイン処理の失敗とは扱わない
            }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).limit(1).get();

        if (snapshot.empty) {
          console.error(`No user found with Stripe customer ID: ${customerId}`);
          break;
        }

        const userDoc = snapshot.docs[0];
        console.log(`Attempting to revoke premium access for user ${userDoc.id}...`);

        await userDoc.ref.update({
          isPremium: false,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        });

        console.log(`Successfully revoked premium access for user ${userDoc.id}`);
        break;
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error(`Error processing webhook event:`, error);
    return NextResponse.json({ error: `Webhook handler failed: ${error.message}` }, { status: 500 });
  }
}
