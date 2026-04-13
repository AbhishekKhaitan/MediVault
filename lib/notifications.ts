// lib/notifications.ts — Expo push notification setup
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

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
