import { create } from 'zustand'
import type { Medication, MedicationLog } from '../types'
import { getActiveMedications, getTodaysMedicationLogs } from '../lib/api'

interface MedicationStore {
  medications: Record<string, Medication[]>  // keyed by member_id
  todaysLogs: Record<string, MedicationLog[]>
  isLoading: boolean
  error: string | null
  loadMedications: (memberId: string) => Promise<void>
  loadTodaysLogs: (memberId: string) => Promise<void>
}

export const useMedicationStore = create<MedicationStore>((set) => ({
  medications: {},
  todaysLogs: {},
  isLoading: false,
  error: null,

  loadMedications: async (memberId: string) => {
    set({ isLoading: true, error: null })
    try {
      const meds = await getActiveMedications(memberId)
      set((state) => ({
        medications: { ...state.medications, [memberId]: meds },
        isLoading: false,
      }))
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  loadTodaysLogs: async (memberId: string) => {
    try {
      const logs = await getTodaysMedicationLogs(memberId)
      set((state) => ({
        todaysLogs: { ...state.todaysLogs, [memberId]: logs },
      }))
    } catch (err) {
      set({ error: String(err) })
    }
  },
}))
