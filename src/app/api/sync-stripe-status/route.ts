import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db, auth } from '@/lib/firebase-admin';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User document not found in Firestore' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId;

    if (!stripeCustomerId) {
      // If there's no customer ID, they can't be premium.
      // If they are marked as premium, correct it.
      if (userData?.isPremium) {
        await userDocRef.update({ isPremium: false, stripeSubscriptionId: null, currentPeriodEnd: null });
        console.log(`Corrected user ${userId}: Marked as not premium because they have no Stripe customer ID.`);
      }
      return NextResponse.json({ message: 'User does not have a Stripe customer ID.' });
    }

    // List active subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all', // Get all subscriptions to find the latest one
      limit: 1, // We only need the most recent one
    });

    let hasActiveSubscription = false;
    let currentPeriodEnd = null;
    let activeSubscriptionId = null;

    if (subscriptions.data.length > 0) {
      const latestSubscription = subscriptions.data[0];
      if (latestSubscription.status === 'active' || latestSubscription.status === 'trialing') {
        hasActiveSubscription = true;
        currentPeriodEnd = latestSubscription.current_period_end;
        activeSubscriptionId = latestSubscription.id;
      }
    }

    // Compare with Firestore and update if necessary
    if (userData?.isPremium !== hasActiveSubscription) {
      await userDocRef.update({
        isPremium: hasActiveSubscription,
        stripeSubscriptionId: activeSubscriptionId,
        currentPeriodEnd: currentPeriodEnd,
      });
      console.log(`Corrected user ${userId}: Set isPremium to ${hasActiveSubscription}`);
    } else {
      console.log(`User ${userId} premium status is already up-to-date.`);
    }

    return NextResponse.json({ message: 'Stripe status synced successfully.' });

  } catch (error: any) {
    console.error('Error in sync-stripe-status:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
