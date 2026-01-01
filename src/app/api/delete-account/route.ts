import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getSecrets } from '@/lib/secrets';
import { Resend } from 'resend';
import { DecodedIdToken } from 'firebase-admin/auth';

// 認証済みユーザー情報を取得するヘルパー
async function getAuthenticatedUser(req: Request): Promise<DecodedIdToken | null> {
  const { auth } = await getFirebaseAdmin();
  const authorization = req.headers.get('Authorization');
  if (authorization?.startsWith('Bearer ')) {
    const idToken = authorization.split('Bearer ')[1];
    try {
      return await auth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      return null;
    }
  }
  return null;
}

// エラー応答を生成するヘルパー関数
function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(req: Request) {
  try {
    // 1. ユーザー認証
    const decodedToken = await getAuthenticatedUser(req);
    if (!decodedToken) {
      return createErrorResponse('Unauthorized', 401);
    }
    const userId = decodedToken.uid;

    // 2. 必要なサービスの初期化
    const { db, auth } = await getFirebaseAdmin();
    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];
    const resendApiKey = secrets['RESEND_API_KEY'];

    if (!stripeSecretKey || !resendApiKey) {
      throw new Error('Stripe or Resend API key is not configured.');
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
    const resend = new Resend(resendApiKey);

    // 3. Firestoreからユーザー情報を取得
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      // ドキュメントがなくてもAuthユーザーは存在し得るので、処理を続行
      console.warn(`User document for ${userId} not found, but proceeding with Auth deletion.`);
    }
    const userData = userDoc.data();
    const userEmail = userData?.email || decodedToken.email;

    // 4. Stripeサブスクリプションと顧客情報を削除 (存在する場合)
    const stripeSubscriptionId = userData?.stripeSubscriptionId;
    if (stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(stripeSubscriptionId);
        console.log(`Stripe subscription ${stripeSubscriptionId} cancelled for user ${userId}.`);
      } catch (error) {
        console.error(`Error cancelling Stripe subscription for user ${userId}:`, error);
        // エラーでも処理を続行
      }
    }
    const stripeCustomerId = userData?.stripeCustomerId;
    if (stripeCustomerId) {
      try {
        await stripe.customers.del(stripeCustomerId);
        console.log(`Stripe customer ${stripeCustomerId} deleted for user ${userId}.`);
      } catch (error) {
        console.error(`Error deleting Stripe customer for user ${userId}:`, error);
        // エラーでも処理を続行
      }
    }

    // 5. Firestoreドキュメントを削除
    if (userDoc.exists) {
      await userDocRef.delete();
      console.log(`Firestore document for user ${userId} deleted.`);
    }

    // 6. Firebase Authからユーザーを削除
    await auth.deleteUser(userId);
    console.log(`Firebase Auth user ${userId} deleted.`);

    // 7. アカウント削除通知メールを送信
    if (userEmail) {
      try {
        await resend.emails.send({
          from: 'ChartTrade Trainer <noreply@resend.dev>',
          to: userEmail,
          subject: 'アカウント削除完了のお知らせ',
          html: `<p>ChartTrade Trainerのアカウントが完全に削除されました。</p><p>ご利用いただき、誠にありがとうございました。</p><p>ChartTrade Trainer 運営</p>`,
        });
        console.log(`Account deletion email sent to ${userEmail}.`);
      } catch (emailError) {
        console.error(`Failed to send deletion email to ${userEmail}:`, emailError);
      }
    }

    // 8. 成功応答
    return NextResponse.json({ success: true, message: 'Account deleted successfully' });

  } catch (error: any) {
    console.error('Error in /api/delete-account:', error);
    return createErrorResponse(error.message || 'An unexpected error occurred.', 500);
  }
}
