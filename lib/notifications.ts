// lib/notifications.ts — Expo push notification setup + local medication reminder scheduling
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Medication } from '../types'

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medications', {
      name: 'Medication Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  return token
}

export async function scheduleMedicationReminder(
  medicationId: string,
  medicationName: string,
  memberName: string,
  dosage: string,
  hour: number,
  minute: number
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time for ${medicationName}`,
      body: `${memberName} needs to take ${medicationName} ${dosage}`,
      data: { medicationId },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  })
  return id
}

export async function cancelMedicationReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId)
}

// ─── Batch helpers for managing a medication's full set of reminders ──────────

const notifKey = (medicationId: string) => `medivault_notif_${medicationId}`

async function getNotifIds(medicationId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(notifKey(medicationId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

async function saveNotifIds(medicationId: string, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(notifKey(medicationId), JSON.stringify(ids))
}

export async function cancelAllMedicationReminders(medicationId: string): Promise<void> {
  const ids = await getNotifIds(medicationId)
  await Promise.all(ids.map((id) => cancelMedicationReminder(id).catch(() => {})))
  await AsyncStorage.removeItem(notifKey(medicationId))
}

export async function scheduleAllReminders(
  medication: Medication,
  memberName: string
): Promise<void> {
  const ids: string[] = []
  for (const time of medication.reminder_times) {
    const parts = time.split(':')
    const h = parseInt(parts[0] ?? '0', 10)
    const m = parseInt(parts[1] ?? '0', 10)
    const id = await scheduleMedicationReminder(
      medication.id,
      medication.name,
      memberName,
      medication.dosage,
      h,
      m
    )
    ids.push(id)
  }
  await saveNotifIds(medication.id, ids)
}
