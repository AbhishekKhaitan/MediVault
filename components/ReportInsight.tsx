// Session 06 will build the full ReportInsight with parsed output display
import { View, Text } from 'react-native'
import type { ParsedReport } from '../types'

interface Props {
  report: ParsedReport
}

export function ReportInsight({ report }: Props) {
  return (
    <View className="bg-slate-50 rounded-xl p-4 border border-slate-200">
      <Text className="text-base font-semibold text-slate-900 mb-2">Summary</Text>
      <Text className="text-sm text-slate-700 leading-5">{report.plain_language_summary}</Text>

      {report.flags.length > 0 && (
        <View className="mt-3">
          <Text className="text-xs font-semibold text-amber-600 mb-1">Values to watch</Text>
          {report.flags.map((flag, i) => (
            <Text key={i} className="text-xs text-amber-700">• {flag}</Text>
          ))}
        </View>
      )}
    </View>
  )
}
