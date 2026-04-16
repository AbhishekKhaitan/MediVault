import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import type { ClarificationItem } from '../types'

interface Props {
  item: ClarificationItem
  onResolved: (field: string, value: string) => void
}

// Shown when OCR confidence < 0.85 on a numeric value.
// The user can either confirm our reading or type the correct value.
export function ClarificationCard({ item, onResolved }: Props) {
  const [manualValue, setManualValue] = useState(item.current_reading)
  const [mode, setMode] = useState<'chips' | 'manual'>('chips')
  const [resolved, setResolved] = useState(false)

  const handleConfirm = (value: string) => {
    setResolved(true)
    onResolved(item.field, value)
  }

  if (resolved) {
    return (
      <View className="flex-row items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-3">
        <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
        <Text className="text-green-700 text-sm font-medium flex-1">
          {item.field} confirmed as <Text className="font-bold">{manualValue}</Text>
        </Text>
      </View>
    )
  }

  return (
    <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3">
      {/* Warning header */}
      <View className="flex-row items-center gap-2 mb-3">
        <Ionicons name="warning-outline" size={18} color="#D97706" />
        <Text className="text-amber-700 font-semibold text-sm flex-1">Value needs confirmation</Text>
      </View>

      <Text className="text-slate-700 text-sm mb-3">{item.question}</Text>

      {/* Our best guess chip */}
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        We read it as:
      </Text>
      <TouchableOpacity
        onPress={() => handleConfirm(item.current_reading)}
        className="bg-white border-2 border-amber-300 rounded-xl px-4 py-2.5 mb-3 flex-row items-center justify-between"
      >
        <Text className="text-slate-900 font-bold text-lg">{item.current_reading}</Text>
        <Text className="text-amber-600 text-sm font-medium">Confirm ✓</Text>
      </TouchableOpacity>

      {/* Manual entry fallback */}
      {mode === 'chips' ? (
        <TouchableOpacity onPress={() => setMode('manual')}>
          <Text className="text-sky-500 text-sm font-medium text-center">
            That's wrong — let me type it
          </Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Enter correct value:
          </Text>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 border border-slate-300 rounded-xl px-3 h-11 text-slate-900 bg-white"
              value={manualValue}
              onChangeText={setManualValue}
              keyboardType="decimal-pad"
              autoFocus
            />
            <TouchableOpacity
              onPress={() => handleConfirm(manualValue)}
              className="bg-sky-500 rounded-xl px-4 h-11 items-center justify-center"
            >
              <Text className="text-white font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}
