// lib/api.ts — All DB calls, typed. No raw Supabase calls in components.
import { supabase } from './supabase'
import type { Family, FamilyMember, Document, HealthMetric, Medication, MedicationLog } from '../types'

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
