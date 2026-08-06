import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Uses the service role key so it can write to any user's profile,
// since this runs with no logged-in user session (Stripe is calling it directly)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function tierFromPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter'
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return 'agency'
  return 'free'
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const customerId = session.customer as string
    const userId = session.client_reference_id

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    const priceId = subscription.items.data[0].price.id
    const tier = tierFromPriceId(priceId)

    await supabaseAdmin
      .from('profiles')
      .update({
        stripe_customer_id: customerId,
        subscription_tier: tier,
        subscription_status: 'active',
      })
      .eq('id', userId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string

    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'inactive',
      })
      .eq('stripe_customer_id', customerId)
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string
    const priceId = subscription.items.data[0].price.id
    const tier = tierFromPriceId(priceId)

    const isPaid = subscription.status === 'active' || subscription.status === 'past_due'

    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: isPaid ? tier : 'free',
        subscription_status: subscription.status,
      })
      .eq('stripe_customer_id', customerId)
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const customerId = invoice.customer as string

    await supabaseAdmin
      .from('profiles')
      .update({ subscription_status: 'past_due' })
      .eq('stripe_customer_id', customerId)
  }

  return NextResponse.json({ received: true })
}