import { create } from 'zustand'
import type { Medication, MedicationLog } from '../types'
import {
  getActiveMedications,
  getTodaysMedicationLogs,
  logMedicationTaken,
  updateMedicationReminderTimes,
  createMedication,
  deactivateMedication,
} from '../lib/api'
import { scheduleAllReminders, cancelAllMedicationReminders } from '../lib/notifications'

interface MedicationStore {
  medications: Record<string, Medication[]>
  todaysLogs: Record<string, MedicationLog[]>
  isLoading: boolean
  error: string | null

  loadMedications: (memberId: string) => Promise<void>
  loadTodaysLogs: (memberId: string) => Promise<void>
  logMedication: (medicationId: string, memberId: string, taken: boolean) => Promise<void>
  setReminderTimes: (medicationId: string, memberId: string, times: string[], memberName: string) => Promise<void>
  addMedication: (medication: Omit<Medication, 'id' | 'created_at'>) => Promise<void>
  removeMedication: (medicationId: string, memberId: string) => Promise<void>
}

export const useMedicationStore = create<MedicationStore>((set, get) => ({
  medications: {},
  todaysLogs: {},
  isLoading: false,
  error: null,

  loadMedications: async (memberId) => {
    set({ isLoading: true, error: null })
    try {
      const meds = await getActiveMedications(memberId)
      set((s) => ({ medications: { ...s.medications, [memberId]: meds }, isLoading: false }))
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  loadTodaysLogs: async (memberId) => {
    try {
      const logs = await getTodaysMedicationLogs(memberId)
      set((s) => ({ todaysLogs: { ...s.todaysLogs, [memberId]: logs } }))
    } catch (err) {
      set({ error: String(err) })
    }
  },

  logMedication: async (medicationId, memberId, taken) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const scheduledTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // Optimistic update — replace any existing log for this medication today
    const optimisticLog: MedicationLog = {
      id: `temp_${Date.now()}`,
      medication_id: medicationId,
      member_id: memberId,
      taken,
      taken_at: taken ? now.toISOString() : null,
      scheduled_time: scheduledTime,
      log_date: today,
      created_at: now.toISOString(),
    }
    set((s) => {
      const existing = (s.todaysLogs[memberId] ?? []).filter(
        (l) => l.medication_id !== medicationId
      )
      return { todaysLogs: { ...s.todaysLogs, [memberId]: [...existing, optimisticLog] } }
    })

    try {
      await logMedicationTaken({
        medication_id: medicationId,
        member_id: memberId,
        taken,
        taken_at: taken ? now.toISOString() : null,
        scheduled_time: scheduledTime,
        log_date: today,
      })
    } catch (err) {
      // Revert optimistic update on failure
      set((s) => {
        const reverted = (s.todaysLogs[memberId] ?? []).filter((l) => l.id !== optimisticLog.id)
        return { todaysLogs: { ...s.todaysLogs, [memberId]: reverted }, error: String(err) }
      })
    }
  },

  setReminderTimes: async (medicationId, memberId, times, memberName) => {
    await cancelAllMedicationReminders(medicationId)

    if (times.length > 0) {
      const med = (get().medications[memberId] ?? []).find((m) => m.id === medicationId)
      if (med) {
        await scheduleAllReminders({ ...med, reminder_times: times }, memberName)
      }
    }

    await updateMedicationReminderTimes(medicationId, times)

    set((s) => {
      const updated = (s.medications[memberId] ?? []).map((m) =>
        m.id === medicationId ? { ...m, reminder_times: times } : m
      )
      return { medications: { ...s.medications, [memberId]: updated } }
    })
  },

  addMedication: async (medication) => {
    const med = await createMedication(medication)
    set((s) => {
      const existing = s.medications[medication.member_id] ?? []
      return { medications: { ...s.medications, [medication.member_id]: [...existing, med] } }
    })
  },

  removeMedication: async (medicationId, memberId) => {
    await cancelAllMedicationReminders(medicationId)
    await deactivateMedication(medicationId)
    set((s) => {
      const filtered = (s.medications[memberId] ?? []).filter((m) => m.id !== medicationId)
      return { medications: { ...s.medications, [memberId]: filtered } }
    })
  },
}))
