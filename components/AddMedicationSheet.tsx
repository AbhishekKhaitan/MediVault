import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Medication } from '../types'

interface Props {
  visible: boolean
  familyId: string
  memberId: string
  onClose: () => void
  onAdded: (medication: Omit<Medication, 'id' | 'created_at'>) => Promise<void>
}

const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Thrice daily',
  'Every 6 hours',
  'Every 8 hours',
  'As needed',
  'Weekly',
]

export function AddMedicationSheet({ visible, familyId, memberId, onClose, onAdded }: Props) {
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('Once daily')
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName('')
    setDosage('')
    setFrequency('Once daily')
    setDuration('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Missing info', 'Please enter the medication name.')
      return
    }
    if (!dosage.trim()) {
      Alert.alert('Missing info', 'Please enter the dosage (e.g. 500mg, 1 tablet).')
      return
    }

    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      await onAdded({
        family_id: familyId,
        member_id: memberId,
        document_id: null,
        name: name.trim(),
        dosage: dosage.trim(),
        frequency,
        duration: duration.trim() || null,
        is_active: true,
        start_date: today,
        end_date: null,
        reminder_times: [],
      })
      reset()
      onClose()
    } catch {
      Alert.alert('Error', 'Could not add medication. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={handleClose}>
        <Pressable onPress={() => {}} className="bg-white rounded-t-3xl px-6 pt-6 pb-10">

          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-lg font-bold text-slate-900">Add Medication</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close-circle" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Medication name */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Medication Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Metformin, Aspirin, Vitamin D"
              className="border border-slate-200 rounded-xl px-4 py-3 text-slate-900 bg-slate-50"
              autoCapitalize="words"
            />
          </View>

          {/* Dosage */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Dosage
            </Text>
            <TextInput
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g. 500mg, 10ml, 1 tablet"
              className="border border-slate-200 rounded-xl px-4 py-3 text-slate-900 bg-slate-50"
            />
          </View>

          {/* Frequency */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Frequency
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
              <View className="flex-row gap-2">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setFrequency(opt)}
                    className={`rounded-full px-4 py-2 border ${
                      frequency === opt ? 'bg-sky-500 border-sky-500' : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        frequency === opt ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Duration */}
          <View className="mb-6">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Duration (optional)
            </Text>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g. 7 days, 1 month, Ongoing"
              className="border border-slate-200 rounded-xl px-4 py-3 text-slate-900 bg-slate-50"
            />
          </View>

          <TouchableOpacity
            onPress={handleAdd}
            disabled={saving}
            className="bg-sky-500 rounded-2xl py-4 items-center flex-row justify-center gap-2"
          >
            {saving && <ActivityIndicator size="small" color="#fff" />}
            <Text className="text-white font-bold text-base">
              {saving ? 'Adding...' : 'Add Medication'}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
