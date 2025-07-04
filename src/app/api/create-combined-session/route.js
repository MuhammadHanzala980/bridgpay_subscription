import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { orderData, subscription } = await request.json();
    const origin = request.headers.get('origin') || process.env.SUCCESS_URL;
    const toCents = (amount) => Math.round(parseFloat(amount || '0') * 100);
    const currency = (orderData.currency || 'USD').toLowerCase();




    const orderTotal = toCents(orderData.total);
    const subscriptionTotal = Array.isArray(subscription) && subscription.length
      ? toCents(subscription[0].total)
      : 0;

    const initialCharge = Math.max(orderTotal - subscriptionTotal, 0);
    const line_items = [];


    if (initialCharge > 0) {
      line_items.push({
        price_data: {
          currency,
          unit_amount: initialCharge,
          product_data: { name: 'Initial Payment' },
        },
        quantity: 1,
      });
    }

    if (subscriptionTotal > 0) {
      const firstSubItem = subscription[0].line_items.find(item =>
        item.meta_data.some(md => md.key === '_wcsatt_scheme' && md.value !== '0')
      );
      const schemeMeta = firstSubItem.meta_data.find(md => md.key === '_wcsatt_scheme');
      const [count, interval] = schemeMeta.value.split('_'); // e.g., ['1','month']

      line_items.push({
        price_data: {
          currency,
          unit_amount: subscriptionTotal,
          recurring: { interval, interval_count: parseInt(count, 10) },
          product_data: { name: 'Subscription Payment' },
        },
        quantity: 1,
      });
    }

    if (!line_items.length) {
      return NextResponse.json(
        { error: 'No valid items to process' },
        { status: 400 }
      );
    }



    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      metadata: {
        order_id: orderData.id,
        subscription_id: subscription[0].id
      },
      subscription_data: { metadata: { subscription_id: subscription[0].id } },
      line_items,
      success_url: `${origin}/payment-status`,
      cancel_url: `${origin}/cancel`,
      metadata: { order_id: String(orderData.id) },
    });
    console.log(session.url)
    return NextResponse.json({ sessionId: session.id });


  } catch (err) {
    console.error('Error creating checkout session:', err);
    return NextResponse.json(
      { error: 'Checkout session creation failed', details: err.message },
      { status: 500 }
    );
  }
}
