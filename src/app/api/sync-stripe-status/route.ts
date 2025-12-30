import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getSecrets } from '@/lib/secrets';

export async function POST(req: NextRequest) {
  try {
    // 1. 初期化
    const { db, auth } = await getFirebaseAdmin();
    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not found.');
    }

    // 2. 認証 (IDトークンの検証)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    // トークンを検証してUIDを取得 (クライアントから送られたuserIdではなく、トークンのUIDを信頼する)
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    console.log(`[API] Syncing Stripe status for user: ${userId}`);

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    // 3. Firestoreからユーザー情報を取得
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const userData = userDoc.data();
    let customerId = userData?.stripeCustomerId;

    // 4. Stripe顧客IDがない場合、メールアドレスで検索
    if (!customerId && userData?.email) {
      console.log(`Stripe customer ID not found for user ${userId}. Searching by email: ${userData.email}`);
      const customers = await stripe.customers.list({
        email: userData.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log(`Customer found on Stripe with email ${userData.email}. Customer ID: ${customerId}`);
        // 見つけた顧客IDをFirestoreに保存
        await userRef.update({ stripeCustomerId: customerId });
      } else {
        console.log(`No Stripe customer found with email ${userData.email}.`);
      }
    }

    if (!customerId) {
      // 顧客が見つからず、かつプレミアムフラグが立っている場合は整合性を修正
      if (userData?.isPremium) {
        await userRef.update({ isPremium: false, stripeSubscriptionId: null, currentPeriodEnd: null });
        console.log(`Data inconsistency fixed for user ${userId}. Set isPremium to false.`);
      }
      return NextResponse.json({ message: 'Stripe customer ID not found. No action taken.' });
    }

    // 5. サブスクリプション状態の確認と更新
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    const isCurrentlyPremiumInDb = userData?.isPremium || false;
    let needsUpdate = false;
    let updateData: any = {};

    if (subscriptions.data.length > 0) {
      // Stripeにアクティブなサブスクリプションがある
      const sub = subscriptions.data[0];
      if (!isCurrentlyPremiumInDb || userData?.stripeSubscriptionId !== sub.id) {
        needsUpdate = true;
        updateData = {
          isPremium: true,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: sub.current_period_end,
        };
        console.log(`User ${userId} should be premium. Updating database.`);
      }
    } else {
      // Stripeにアクティブなサブスクリプションがない
      if (isCurrentlyPremiumInDb) {
        needsUpdate = true;
        updateData = {
          isPremium: false,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        };
        console.log(`User ${userId} should not be premium. Updating database.`);
      }
    }

    if (needsUpdate) {
      await userRef.update(updateData);
      return NextResponse.json({ message: 'User status synced successfully.', updated: true });
    }

    return NextResponse.json({ message: 'User status is already up to date.', updated: false });

  } catch (error: any) {
    console.error('[API] Sync error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}