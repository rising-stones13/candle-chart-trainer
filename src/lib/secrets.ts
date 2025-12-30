// src/lib/secrets.ts

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import dotenv from 'dotenv';

// .env.localファイルから環境変数を読み込む
dotenv.config({ path: '.env.local' });

let cachedSecrets: Record<string, string> | null = null;

const projectNumber = '300945394050'; 

async function accessSecretVersion(secretName: string, client: SecretManagerServiceClient): Promise<string> {
  try {
    const [version] = await client.accessSecretVersion({
      name: `projects/${projectNumber}/secrets/${secretName}/versions/latest`,
    });
    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error(`Secret ${secretName} has no payload.`);
    }
    return payload;
  } catch (error) {
    console.error(`Error accessing secret ${secretName}:`, error);
    throw new Error(`Could not access secret ${secretName}.`);
  }
}

export async function getSecrets(): Promise<Record<string, string>> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  // ローカル開発環境では .env.local からシークレットを読み込む
  if (process.env.NODE_ENV === 'development') {
    console.log('[secrets.ts] getSecrets(): Running in development mode. Loading from process.env.');
    
    const secrets = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID!,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL!,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
      // Public variables are accessed directly via process.env in the frontend,
      // but we can ensure they are present here.
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!,
    };
    
    const missingSecrets = Object.entries(secrets)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingSecrets.length > 0) {
      throw new Error(`Missing environment variables for local development: ${missingSecrets.join(', ')}. Please check your .env.local file.`);
    }

    cachedSecrets = secrets;
    console.log('[secrets.ts] getSecrets(): Successfully loaded secrets from .env.local.');
    return secrets;
  }

  // 本番環境では Secret Manager から取得
  console.log('[secrets.ts] getSecrets(): Running in production mode. Fetching from Secret Manager...');
  
  const client = new SecretManagerServiceClient();
  
  const secretNames = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID',
  ];

  try {
    const secretPromises = secretNames.map(async (name) => {
      const value = await accessSecretVersion(name, client);
      return { [name]: value };
    });
    
    const allSecrets = await Promise.all(secretPromises);
    cachedSecrets = allSecrets.reduce((acc, current) => ({ ...acc, ...current }), {});

    console.log('[secrets.ts] getSecrets(): Successfully fetched and cached secrets from Secret Manager.');
    return cachedSecrets;

  } catch (error) {
    console.error('[secrets.ts] getSecrets(): Failed to fetch secrets from Secret Manager:', error);
    throw new Error('Could not fetch secrets, stopping server.');
  }
}
