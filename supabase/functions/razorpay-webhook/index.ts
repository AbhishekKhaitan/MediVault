// supabase/functions/razorpay-webhook/index.ts
// Handles Razorpay subscription lifecycle events.
// Session 09 will integrate with the paywall UI.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

serve(async (req) => {
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!

  // Verify Razorpay signature
  const signature = req.headers.get('x-razorpay-signature')
  const body = await req.text()

  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex')

  if (signature !== expectedSignature) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
  }

  const event = JSON.parse(body)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const subscriptionId = event.payload?.subscription?.entity?.id
  if (!subscriptionId) {
    return new Response(JSON.stringify({ error: 'No subscription ID' }), { status: 400 })
  }

  switch (event.event) {
    case 'subscription.activated': {
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1)
      await supabase
        .from('families')
        .update({
          subscription_status: 'active',
          subscription_end_date: endDate.toISOString(),
          razorpay_subscription_id: subscriptionId,
        })
        .eq('razorpay_subscription_id', subscriptionId)
      break
    }

    case 'subscription.charged': {
      // Extend by 1 month from current end date
      const { data: family } = await supabase
        .from('families')
        .select('subscription_end_date')
        .eq('razorpay_subscription_id', subscriptionId)
        .single()

      if (family?.subscription_end_date) {
        const newEnd = new Date(family.subscription_end_date)
        newEnd.setMonth(newEnd.getMonth() + 1)
        await supabase
          .from('families')
          .update({ subscription_end_date: newEnd.toISOString() })
          .eq('razorpay_subscription_id', subscriptionId)
      }
      break
    }

    case 'subscription.cancelled': {
      // Keep access until period end
      await supabase
        .from('families')
        .update({ subscription_status: 'cancelled' })
        .eq('razorpay_subscription_id', subscriptionId)
      break
    }

    case 'subscription.halted': {
      // Immediate cancellation + notify admin
      await supabase
        .from('families')
        .update({
          subscription_status: 'cancelled',
          subscription_end_date: new Date().toISOString(),
        })
        .eq('razorpay_subscription_id', subscriptionId)
      // TODO (Session 09): Send push notification to admin about failed payment
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
