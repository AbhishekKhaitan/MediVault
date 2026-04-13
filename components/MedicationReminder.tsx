// Session 07 will build the full MedicationReminder with tick/cross
import { View, Text, TouchableOpacity } from 'react-native'
import type { Medication } from '../types'

interface Props {
  medication: Medication
  taken?: boolean
  onTaken: (taken: boolean) => void
}

export function MedicationReminder({ medication, taken, onTaken }: Props) {
  return (
    <View className="flex-row items-center justify-between bg-white rounded-xl border border-slate-200 p-4 mb-2">
      <View className="flex-1">
        <Text className="font-semibold text-slate-900">{medication.name}</Text>
        <Text className="text-sm text-slate-500">{medication.dosage} · {medication.frequency}</Text>
      </View>
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => onTaken(true)}
          className={`w-10 h-10 rounded-full items-center justify-center ${taken === true ? 'bg-green-500' : 'bg-green-50 border border-green-200'}`}
        >
          <Text className={taken === true ? 'text-white' : 'text-green-600'}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onTaken(false)}
          className={`w-10 h-10 rounded-full items-center justify-center ${taken === false ? 'bg-red-500' : 'bg-red-50 border border-red-200'}`}
        >
          <Text className={taken === false ? 'text-white' : 'text-red-600'}>✗</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
