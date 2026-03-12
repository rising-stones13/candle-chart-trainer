// src/lib/secrets.ts

export async function getSecrets(): Promise<Record<string, string>> {
  // 環境変数から読み込む (ローカルは .env.local、本番は App Hosting が注入)
  const secrets = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID!,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL!,
    // 秘密鍵の改行コードを復元 (App Hosting/Functions の仕様に合わせる)
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
    RESEND_API_KEY: process.env.RESEND_API_KEY!,
    
    // パブリック変数も確認のために含める
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID!,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY!,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN!,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET!,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID!,
    NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID: process.env.VITE_STRIPE_PREMIUM_PRICE_ID!,
  };

  // 必須変数のチェック
  const missingSecrets = Object.entries(secrets)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingSecrets.length > 0) {
    console.warn(`[getSecrets] Missing environment variables: ${missingSecrets.join(', ')}`);
  } else {
    console.log('[getSecrets] All environment variables are loaded.');
  }

  return secrets;
}