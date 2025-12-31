import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getSecrets } from '@/lib/secrets';
import { Resend } from 'resend';

// エラー応答を生成するヘルパー関数
function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function POST(req: Request) {
  try {
    const { db } = await getFirebaseAdmin();
    const secrets = await getSecrets();
    const stripeSecretKey = secrets['STRIPE_SECRET_KEY'];
    const resendApiKey = secrets['RESEND_API_KEY'];

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key is not configured.');
    }
     if (!resendApiKey) {
      throw new Error('Resend API key is not configured.');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });
    const resend = new Resend(resendApiKey);

    // リクエストボディを安全にパース
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return createErrorResponse('Invalid request body', 400);
    }

    const { userId } = body;

    if (!userId) {
      return createErrorResponse('User ID is required', 400);
    }

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return createErrorResponse('User not found', 404);
    }

    const userData = userDoc.data();
    const stripeSubscriptionId = userData?.stripeSubscriptionId;
    const stripeCustomerId = userData?.stripeCustomerId;
    const userEmail = userData?.email; 

    if (!stripeSubscriptionId) {
      return createErrorResponse('No active subscription found for this user', 400);
    }
     if (!userEmail) {
      // 念のためメールアドレスが存在しない場合のエラーハンドリング
      console.error(`User ${userId} does not have an email address.`);
      // この場合でも処理は続行するが、メールは送信されない
    }

    // Stripeサブスクリプションのキャンセルを実行
    await stripe.subscriptions.cancel(stripeSubscriptionId);

    // Stripe顧客の削除を実行
    if (stripeCustomerId) {
      await stripe.customers.del(stripeCustomerId);
    }

    // FirestoreのユーザードキュメントからStripe関連のフィールドを削除
    await userDocRef.update({
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      isPremium: false,
      // plan: 'free', // isPremiumで管理するためplanは不要になる可能性
      // status: 'canceled', // isPremiumで管理するためstatusは不要になる可能性
    });
    
    // メール送信
    if (userEmail) {
        try {
            await resend.emails.send({
                from: 'ChartTrade Trainer <noreply@resend.dev>', // 送信元
                to: userEmail,
                subject: 'プレミアムプランの解約が完了しました',
                html: `
                    <p>ChartTrade Trainerのプレミアムプランの解約手続きが完了いたしました。</p>
                    <p>ご利用いただき、誠にありがとうございました。</p>
                    <p>またのご利用を心よりお待ちしております。</p>
                    <p>ChartTrade Trainer 運営</p>
                `,
            });
        } catch (emailError) {
            console.error(`Failed to send cancellation email to ${userEmail}:`, emailError);
            // メール送信の失敗は、メインの処理の成否に影響させない
        }
    }


    // 成功応答
    return NextResponse.json({ success: true, status: 'cancellation_completed' });

  } catch (error: any) {
    console.error('Error in /api/cancel-subscription:', error);

    let errorMessage = 'An unexpected error occurred.';
    let statusCode = 500;

    // Stripeからのエラーをハンドリング
    if (error.type && error.type.startsWith('Stripe')) {
      errorMessage = error.message;
      statusCode = error.statusCode || 500;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return createErrorResponse(errorMessage, statusCode);
  }
}
