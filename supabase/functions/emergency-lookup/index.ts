// supabase/functions/emergency-lookup/index.ts
// Public GET endpoint — no auth required.
// Session 08 will wire up push notifications.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RATE_LIMIT_PER_HOUR = 10

// Simple in-memory rate limiter (resets on function cold start)
const requestCounts: Map<string, { count: number; resetAt: number }> = new Map()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = requestCounts.get(ip)

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + 3600_000 })
    return false
  }

  if (entry.count >= RATE_LIMIT_PER_HOUR) return true
  entry.count++
  return false
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const clientIp = req.headers.get('x-forwarded-for') ?? 'unknown'

  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const url = new URL(req.url)
  const phone = url.searchParams.get('phone')

  if (!phone) {
    return new Response(
      JSON.stringify({ error: 'Phone number required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Lookup member by phone — must have emergency_access_enabled
  const { data: member, error: memberError } = await supabase
    .from('family_members')
    .select('*')
    .eq('phone', phone)
    .eq('emergency_access_enabled', true)
    .single()

  if (memberError || !member) {
    return new Response(
      JSON.stringify({ error: 'No emergency profile found for this number.' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Fetch active medications
  const { data: medications } = await supabase
    .from('medications')
    .select('name, dosage, frequency')
    .eq('member_id', member.id)
    .eq('is_active', true)

  // Fetch last 3 document summaries
  const { data: documents } = await supabase
    .from('documents')
    .select('ai_parsed')
    .eq('member_id', member.id)
    .eq('parsing_status', 'done')
    .order('document_date', { ascending: false })
    .limit(3)

  const recentSummaries = (documents ?? [])
    .map((d: any) => d.ai_parsed?.plain_language_summary)
    .filter(Boolean)

  // Log every access — no exceptions
  await supabase.from('emergency_access_logs').insert({
    member_id: member.id,
    accessed_by_ip: clientIp,
    user_agent: req.headers.get('user-agent') ?? 'unknown',
  })

  // TODO (Session 08): Send push notification to family admin

  const profile = {
    name: member.name,
    blood_group: member.blood_group,
    known_allergies: member.known_allergies ?? [],
    active_medications: medications ?? [],
    recent_summaries: recentSummaries,
    emergency_contact_name: null,
    emergency_contact_phone: null,
  }

  return new Response(JSON.stringify(profile), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
