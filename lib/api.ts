// lib/api.ts — All DB calls, typed. No raw Supabase calls in components.
import { supabase } from './supabase'
import type { Family, FamilyMember, Document, HealthMetric, Medication, MedicationLog, BloodGroup } from '../types'

// ─── Auth helpers ─────────────────────────────────────────────────────────────

// Send OTP to an Indian phone number. Always prefix with +91.
export async function sendPhoneOtp(phone: string): Promise<void> {
  const e164 = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`
  const { error } = await supabase.auth.signInWithOtp({ phone: e164 })
  if (error) throw error
}

// Verify the 6-digit OTP the user received over SMS.
export async function verifyPhoneOtp(phone: string, token: string): Promise<void> {
  const e164 = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`
  const { error } = await supabase.auth.verifyOtp({
    phone: e164,
    token,
    type: 'sms',
  })
  if (error) throw error
}

// Check whether the currently logged-in user already has a family member row.
// Returns true  → existing user, go straight to (app)/
// Returns false → new user, send to register screen to set up their family
export async function userHasFamily(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('family_members')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  return data !== null
}

// ─── Registration — create family + first member in one flow ─────────────────

export interface RegisterPayload {
  familyName: string
  memberName: string
  relation: string
  dateOfBirth: string | null      // 'YYYY-MM-DD'
  bloodGroup: BloodGroup | null
  knownAllergies: string[]
  phone: string
  pushToken: string | null
}

export async function registerFamilyAndFirstMember(
  payload: RegisterPayload
): Promise<{ family: Family; member: FamilyMember }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Step 1 — Create the family row
  const { data: familyData, error: familyError } = await supabase
    .from('families')
    .insert({ name: payload.familyName, created_by: user.id })
    .select()
    .single()

  if (familyError) throw familyError
  const family = familyData as Family

  // Step 2 — Create the first member (the person registering).
  // is_admin = true because they created the family.
  const { data: memberData, error: memberError } = await supabase
    .from('family_members')
    .insert({
      family_id: family.id,
      user_id: user.id,
      name: payload.memberName,
      relation: payload.relation,
      date_of_birth: payload.dateOfBirth,
      blood_group: payload.bloodGroup,
      known_allergies: payload.knownAllergies,
      phone: payload.phone,
      is_admin: true,
      emergency_access_enabled: true,
    })
    .select()
    .single()

  if (memberError) throw memberError

  return { family, member: memberData as FamilyMember }
}

// ─── Families ────────────────────────────────────────────────────────────────

export async function getMyFamily(): Promise<Family | null> {
  const { data: member } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single()

  if (!member) return null

  const { data } = await supabase
    .from('families')
    .select('*')
    .eq('id', member.family_id)
    .single()

  return data as Family | null
}

export async function createFamily(name: string): Promise<Family> {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('families')
    .insert({ name, created_by: user.id })
    .select()
    .single()

  if (error) throw error
  return data as Family
}

// ─── Family Members ──────────────────────────────────────────────────────────

export async function getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at')

  if (error) throw error
  return (data ?? []) as FamilyMember[]
}

export async function createFamilyMember(
  member: Omit<FamilyMember, 'id' | 'created_at'>
): Promise<FamilyMember> {
  const { data, error } = await supabase
    .from('family_members')
    .insert(member)
    .select()
    .single()

  if (error) throw error
  return data as FamilyMember
}

export async function getMyMemberProfile(): Promise<FamilyMember | null> {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return null

  const { data } = await supabase
    .from('family_members')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data as FamilyMember | null
}

// ─── Documents ───────────────────────────────────────────────────────────────

export async function getDocumentsForMember(memberId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('member_id', memberId)
    .order('document_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as Document[]
}

export async function createDocument(
  doc: Omit<Document, 'id' | 'created_at' | 'ocr_raw_text' | 'ai_parsed' | 'needs_user_clarification' | 'user_clarifications'>
): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert({ ...doc, parsing_status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return data as Document
}

export async function updateDocumentClarifications(
  documentId: string,
  clarifications: Record<string, string>
): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ user_clarifications: clarifications })
    .eq('id', documentId)

  if (error) throw error
}

// ─── Health Metrics ───────────────────────────────────────────────────────────

export async function getHealthMetricsForMember(
  memberId: string,
  metricName?: string
): Promise<HealthMetric[]> {
  let query = supabase
    .from('health_metrics')
    .select('*')
    .eq('member_id', memberId)
    .order('recorded_at', { ascending: true })

  if (metricName) {
    query = query.eq('metric_name', metricName)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as HealthMetric[]
}

// ─── Medications ──────────────────────────────────────────────────────────────

export async function getActiveMedications(memberId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('member_id', memberId)
    .eq('is_active', true)

  if (error) throw error
  return (data ?? []) as Medication[]
}

export async function updateMedicationReminderTimes(
  medicationId: string,
  reminderTimes: string[]
): Promise<void> {
  const { error } = await supabase
    .from('medications')
    .update({ reminder_times: reminderTimes })
    .eq('id', medicationId)

  if (error) throw error
}

// ─── Medication Logs ──────────────────────────────────────────────────────────

export async function logMedicationTaken(
  log: Omit<MedicationLog, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await supabase
    .from('medication_logs')
    .insert(log)

  if (error) throw error
}

export async function getTodaysMedicationLogs(memberId: string): Promise<MedicationLog[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('medication_logs')
    .select('*')
    .eq('member_id', memberId)
    .eq('log_date', today)

  if (error) throw error
  return (data ?? []) as MedicationLog[]
}
