import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Medication } from '../types'

interface Props {
  medication: Medication
  taken?: boolean
  onTaken: (taken: boolean) => void
  onUpdateTimes: (times: string[]) => Promise<void>
  onRemove?: () => Promise<void>
}

const PRESET_TIMES = [
  { label: 'Morning', time: '08:00' },
  { label: 'Afternoon', time: '13:00' },
  { label: 'Evening', time: '18:00' },
  { label: 'Night', time: '21:00' },
]

export function MedicationReminder({ medication, taken, onTaken, onUpdateTimes, onRemove }: Props) {
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedTimes, setSelectedTimes] = useState<string[]>(medication.reminder_times ?? [])
  const [customTime, setCustomTime] = useState('')
  const [saving, setSaving] = useState(false)

  const openPicker = () => {
    setSelectedTimes(medication.reminder_times ?? [])
    setCustomTime('')
    setShowTimePicker(true)
  }

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time].sort()
    )
  }

  const addCustomTime = () => {
    const match = customTime.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) {
      Alert.alert('Invalid time', 'Enter time as HH:MM (e.g. 07:30)')
      return
    }
    const h = parseInt(match[1] ?? '0', 10)
    const m = parseInt(match[2] ?? '0', 10)
    if (h > 23 || m > 59) {
      Alert.alert('Invalid time', 'Hours must be 0–23, minutes 0–59')
      return
    }
    const normalized = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    if (!selectedTimes.includes(normalized)) {
      setSelectedTimes((prev) => [...prev, normalized].sort())
    }
    setCustomTime('')
  }

  const saveTimes = async () => {
    setSaving(true)
    try {
      await onUpdateTimes(selectedTimes)
      setShowTimePicker(false)
    } catch {
      Alert.alert('Error', 'Could not save reminder times. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const confirmRemove = () => {
    if (!onRemove) return
    Alert.alert(
      'Remove medication',
      `Remove ${medication.name} from the active list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
      ]
    )
  }

  const reminderTimes = medication.reminder_times ?? []

  return (
    <>
      <View className="bg-white rounded-xl border border-slate-200 p-4 mb-2">

        {/* ── Top row: name + tick/cross ── */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text className="font-semibold text-slate-900 text-base">{medication.name}</Text>
            <Text className="text-sm text-slate-500 mt-0.5">
              {medication.dosage} · {medication.frequency}
            </Text>
            {medication.duration && (
              <Text className="text-xs text-slate-400 mt-0.5">Duration: {medication.duration}</Text>
            )}
          </View>
          <View className="flex-row gap-2 items-center">
            <TouchableOpacity
              onPress={() => onTaken(true)}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                taken === true ? 'bg-green-500' : 'bg-green-50 border border-green-200'
              }`}
            >
              <Ionicons name="checkmark" size={20} color={taken === true ? '#fff' : '#16A34A'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onTaken(false)}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                taken === false ? 'bg-red-500' : 'bg-red-50 border border-red-200'
              }`}
            >
              <Ionicons name="close" size={20} color={taken === false ? '#fff' : '#DC2626'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Reminder time chips + edit ── */}
        <View className="flex-row items-center flex-wrap gap-1.5 mt-3">
          {reminderTimes.length > 0 ? (
            reminderTimes.map((t) => (
              <View
                key={t}
                className="flex-row items-center bg-sky-50 border border-sky-100 rounded-full px-2.5 py-0.5"
              >
                <Ionicons name="alarm-outline" size={11} color="#0EA5E9" />
                <Text className="text-sky-600 text-xs ml-1 font-medium">{t}</Text>
              </View>
            ))
          ) : (
            <Text className="text-slate-400 text-xs">No reminders set</Text>
          )}

          <TouchableOpacity
            onPress={openPicker}
            className="flex-row items-center bg-slate-100 rounded-full px-2.5 py-0.5"
          >
            <Ionicons name="alarm-outline" size={11} color="#64748B" />
            <Text className="text-slate-500 text-xs ml-1">
              {reminderTimes.length > 0 ? 'Edit' : 'Set reminder'}
            </Text>
          </TouchableOpacity>

          {onRemove && (
            <TouchableOpacity
              onPress={confirmRemove}
              className="flex-row items-center bg-red-50 rounded-full px-2.5 py-0.5"
            >
              <Ionicons name="trash-outline" size={11} color="#EF4444" />
              <Text className="text-red-400 text-xs ml-1">Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Reminder time picker modal ── */}
      <Modal visible={showTimePicker} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowTimePicker(false)}
        >
          <Pressable onPress={() => {}} className="bg-white rounded-t-3xl px-6 pt-6 pb-10">

            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-lg font-bold text-slate-900">Set Reminders</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Quick select
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {PRESET_TIMES.map(({ label, time }) => {
                const active = selectedTimes.includes(time)
                return (
                  <TouchableOpacity
                    key={time}
                    onPress={() => toggleTime(time)}
                    className={`flex-row items-center rounded-full px-4 py-2 border ${
                      active ? 'bg-sky-500 border-sky-500' : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-700'}`}>
                      {label}
                    </Text>
                    <Text className={`text-xs ml-1.5 ${active ? 'text-sky-100' : 'text-slate-400'}`}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Custom time
            </Text>
            <View className="flex-row gap-2 mb-4">
              <TextInput
                value={customTime}
                onChangeText={setCustomTime}
                placeholder="HH:MM (e.g. 07:30)"
                keyboardType="numbers-and-punctuation"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 bg-slate-50"
              />
              <TouchableOpacity
                onPress={addCustomTime}
                className="bg-slate-100 rounded-xl px-4 items-center justify-center"
              >
                <Text className="text-slate-700 font-semibold">Add</Text>
              </TouchableOpacity>
            </View>

            {selectedTimes.length > 0 && (
              <View className="flex-row flex-wrap gap-1.5 mb-5">
                {selectedTimes.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setSelectedTimes((prev) => prev.filter((x) => x !== t))}
                    className="flex-row items-center bg-sky-50 border border-sky-200 rounded-full px-3 py-1"
                  >
                    <Text className="text-sky-700 text-sm font-medium mr-1">{t}</Text>
                    <Ionicons name="close" size={14} color="#0369A1" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={saveTimes}
              disabled={saving}
              className="bg-sky-500 rounded-2xl py-4 items-center flex-row justify-center gap-2"
            >
              {saving && <ActivityIndicator size="small" color="#fff" />}
              <Text className="text-white font-bold text-base">
                {saving
                  ? 'Saving...'
                  : selectedTimes.length > 0
                  ? `Save (${selectedTimes.length} reminder${selectedTimes.length > 1 ? 's' : ''})`
                  : 'Clear reminders'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
