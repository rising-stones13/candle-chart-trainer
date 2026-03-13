// src/lib/secrets.ts

export async function getSecrets(): Promise<Record<string, string>> {
  // 環境変数から読み込む
  const secrets: Record<string, string> = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
    FIREBASE_PRIVATE_KEY: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',

    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || '',
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || '',
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || '',
    VITE_STRIPE_PREMIUM_PRICE_ID: process.env.VITE_STRIPE_PREMIUM_PRICE_ID || '',
    VITE_APP_URL: process.env.VITE_APP_URL || '',
  };

  const missingSecrets = Object.entries(secrets)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingSecrets.length > 0) {
    console.warn(`[getSecrets] Missing environment variables: ${missingSecrets.join(', ')}`);
  }

  return secrets;
}