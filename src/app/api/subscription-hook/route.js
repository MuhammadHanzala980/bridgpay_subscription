 import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import axios from 'axios'

export const runtime = 'nodejs'  

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_HOOK_SIGNIN_SECRET

const wcApi = axios.create({
  baseURL: `${process.env.SITE_URL}/wp-json/wc/v3`,
  auth: {
    username: process.env.CONSUMER_KEY,
    password: process.env.CONSUMER_SECRET,
  },
})

export async function POST(request) {
   const payload = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret)
  } catch (err) {
    console.error('⚠️ Signature verification failed:', err.message)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }
  const subId = event.data.object.id || event.data.object.subscription
  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await wcApi.put(`/subscriptions/${subId}`, { status: 'active' })
        break
      case 'invoice.payment_failed':
        await wcApi.put(`/subscriptions/${subId}`, { status: 'on-hold' })
        break
        case 'customer.subscription.updated':
        console.log('Webhook hit:', event.type)
        console.log(event)
        await wcApi.put(`/subscriptions/${subId}`, {
          date_paid: event.data.object.current_period_end,
        })
        break
      case 'customer.subscription.deleted':
        await wcApi.put(`/subscriptions/${subId}`, { status: 'cancelled' })
        break
      default:
        // console.log('Unhandled event:', event.type)
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('WC API error:', err.response?.data || err.message)
    return new NextResponse('WC update failed', { status: 500 })
  }
}

 export function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 })
}
