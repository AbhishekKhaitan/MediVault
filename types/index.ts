// types/index.ts — All shared TypeScript types for MediVault

export type SubscriptionStatus = 'free' | 'active' | 'cancelled'
export type DocumentType = 'lab_report' | 'prescription' | 'discharge_summary' | 'xray' | 'other'
export type ParsingStatus = 'pending' | 'processing' | 'done' | 'failed'
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export interface Family {
  id: string
  name: string
  created_by: string
  subscription_status: SubscriptionStatus
  subscription_end_date: string | null
  razorpay_subscription_id: string | null
  created_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string | null
  name: string
  date_of_birth: string | null
  blood_group: BloodGroup | null
  known_allergies: string[]
  phone: string | null
  relation: string
  is_admin: boolean
  emergency_access_enabled: boolean
  avatar_url: string | null
  created_at: string
}

export interface Document {
  id: string
  family_id: string
  member_id: string
  document_type: DocumentType
  title: string | null
  doctor_name: string | null
  hospital_name: string | null
  document_date: string | null
  storage_path: string
  ocr_raw_text: string | null
  ai_parsed: ParsedReport | null
  parsing_status: ParsingStatus
  needs_user_clarification: ClarificationItem[] | null
  user_clarifications: Record<string, string> | null
  created_at: string
}

export interface ParsedReport {
  document_type: DocumentType
  document_date: string | null
  doctor_name: string | null
  hospital_name: string | null
  lab_name: string | null
  metrics: HealthMetricRaw[]
  medications: MedicationRaw[]
  plain_language_summary: string
  flags: string[]
  comparison_needed: boolean
}

export interface HealthMetricRaw {
  name: string
  value: number
  unit: string
  reference_min: number | null
  reference_max: number | null
  is_flagged: boolean
}

export interface MedicationRaw {
  name: string
  dosage: string
  frequency: string
  duration: string | null
}

export interface ClarificationItem {
  field: string
  question: string
  options: string[]
  current_reading: string
}

export interface HealthMetric {
  id: string
  family_id: string
  member_id: string
  document_id: string
  metric_name: string
  value: number
  unit: string
  reference_min: number | null
  reference_max: number | null
  is_flagged: boolean
  recorded_at: string
  created_at: string
}

export interface Medication {
  id: string
  family_id: string
  member_id: string
  document_id: string | null
  name: string
  dosage: string
  frequency: string
  duration: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  reminder_times: string[]
  created_at: string
}

export interface MedicationLog {
  id: string
  medication_id: string
  member_id: string
  taken: boolean
  taken_at: string | null
  scheduled_time: string
  created_at: string
}

export interface EmergencyAccessLog {
  id: string
  member_id: string
  accessed_by_ip: string
  accessed_at: string
}

export interface EmergencyProfile {
  name: string
  blood_group: BloodGroup | null
  known_allergies: string[]
  active_medications: Pick<Medication, 'name' | 'dosage' | 'frequency'>[]
  recent_summaries: string[]
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}
