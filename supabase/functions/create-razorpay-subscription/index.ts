// supabase/functions/create-razorpay-subscription/index.ts
// Creates a Razorpay subscription for the given family and plan type.
// Returns the Razorpay-hosted checkout short_url so the client can open it.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { plan_type, family_id } = (await req.json()) as {
      plan_type: 'monthly' | 'yearly'
      family_id: string
    }

    if (!plan_type || !family_id) {
      return new Response(JSON.stringify({ error: 'plan_type and family_id are required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!
    const planId =
      plan_type === 'yearly'
        ? Deno.env.get('RAZORPAY_PLAN_ID_YEARLY')!
        : Deno.env.get('RAZORPAY_PLAN_ID_MONTHLY')!

    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)

    // Create the subscription on Razorpay
    const rpRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: planId,
        // Monthly: rolling 10-year window; yearly: 5 renewals max
        total_count: plan_type === 'yearly' ? 5 : 120,
        quantity: 1,
        notes: { family_id, plan_type },
      }),
    })

    if (!rpRes.ok) {
      const err = await rpRes.text()
      console.error('Razorpay error:', err)
      return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const subscription = await rpRes.json()

    // Persist the pending subscription ID so the webhook can match it later
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    await supabase
      .from('families')
      .update({ razorpay_subscription_id: subscription.id })
      .eq('id', family_id)

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        short_url: subscription.short_url,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
