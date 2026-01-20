import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const sanitizeNumber = (v) => {
  if (v == null) return 0;
  const s = String(v).replace(/[,₹$£€\s]/g, '').trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const toCents = (amount) => Math.round(sanitizeNumber(amount) * 100);

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Missing Stripe key' }, { status: 500 });
    }

    const body = await request.json();
    const { orderData, subscription } = body || {};

    if (!orderData || typeof orderData.total === 'undefined') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.SUCCESS_URL || '';
    const currency = (orderData.currency || 'USD').toString().toLowerCase();
    const subscriptionObj = Array.isArray(subscription) ? subscription[0] : subscription;
    const hasSubscription = Boolean(subscriptionObj && (subscriptionObj.total || subscriptionObj.amount));

    const line_items = [];

    const subscriptionTotal = hasSubscription ? toCents(subscriptionObj.total ?? subscriptionObj.amount ?? 0) : 0;
    const orderTotal = toCents(orderData.total);
    const oneTimeAmount = orderTotal - subscriptionTotal;

    if (oneTimeAmount > 0) {
      line_items.push({
        price_data: {
          currency,
          unit_amount: oneTimeAmount,
          product_data: {
            name: 'Order Payment',
            metadata: { order_id: String(orderData.id) }
          },
        },
        quantity: 1,
      });
    }

    if (hasSubscription && subscriptionTotal > 0) {
      const rawInterval = (subscriptionObj.billing_period ?? 'month').toString().toLowerCase();
      const rawCount = parseInt(subscriptionObj.billing_interval ?? 1, 10) || 1;
      const allowed = new Set(['day', 'week', 'month', 'year']);
      const intervalSafe = allowed.has(rawInterval) ? rawInterval : 'month';
      const intervalCountSafe = Math.max(1, rawCount);

      line_items.push({
        price_data: {
          currency,
          unit_amount: subscriptionTotal,
          recurring: {
            interval: intervalSafe,
            interval_count: intervalCountSafe
          },
          product_data: {
            name: 'Subscription Payment',
            metadata: { subscription_id: String(subscriptionObj.id) }
          },
        },
        quantity: 1,
      });
    }

    if (!line_items.length) {
      return NextResponse.json({ error: 'No valid items' }, { status: 400 });
    }

    const hasRecurringItems = line_items.some(item => item.price_data?.recurring);
    const mode = hasRecurringItems ? 'subscription' : 'payment';

    const commonMetadata = {
      order_id: String(orderData.id ?? ''),
    };

    if (hasSubscription && subscriptionObj.id) {
      commonMetadata.subscription_id = String(subscriptionObj.id);
    }

    const sessionParams = {
      payment_method_types: ['card'],
      mode,
      line_items,
      success_url: `${origin}/payment-status`,
      cancel_url: `${origin}/payment-status`,
      metadata: commonMetadata,
    };

    if (mode === 'subscription' && subscriptionObj?.id) {
      sessionParams.subscription_data = {
        metadata: {
          subscription_id: String(subscriptionObj.id)
        }
      };
    }

    console.log('Creating Stripe session with line_items:', JSON.stringify(line_items, null, 2));
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json(session);
  } catch (err) {
    console.error('Error creating checkout session:', err);
    const message = err?.message || String(err);
    return NextResponse.json({ error: 'Checkout session creation failed', details: message }, { status: 500 });
  }
}
