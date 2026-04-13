import { createClient } from '@supabase/supabase-js'
import type { Family, FamilyMember, Document, HealthMetric, Medication, MedicationLog, EmergencyAccessLog } from '../types'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Database type helper — maps table names to their row types
export type Database = {
  families: Family
  family_members: FamilyMember
  documents: Document
  health_metrics: HealthMetric
  medications: Medication
  medication_logs: MedicationLog
  emergency_access_logs: EmergencyAccessLog
}
