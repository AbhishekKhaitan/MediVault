// Session 06 will build the full TrendChart using Victory Native
import { View, Text } from 'react-native'
import type { HealthMetric } from '../types'

interface Props {
  metricName: string
  metrics: HealthMetric[]
}

export function TrendChart({ metricName, metrics }: Props) {
  // Victory Native line chart will be implemented in Session 06
  return (
    <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
      <Text className="font-semibold text-slate-900 mb-1">{metricName}</Text>
      <Text className="text-slate-400 text-sm">{metrics.length} readings · Chart — Session 06</Text>
    </View>
  )
}
