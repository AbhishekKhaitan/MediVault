// Session 06 will build the full DocumentCard
import { View, Text } from 'react-native'
import type { Document } from '../types'

interface Props {
  document: Document
}

export function DocumentCard({ document }: Props) {
  return (
    <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
      <Text className="font-semibold text-slate-900">{document.title ?? document.document_type}</Text>
      {document.document_date && (
        <Text className="text-sm text-slate-500 mt-1">{document.document_date}</Text>
      )}
      {document.ai_parsed?.plain_language_summary && (
        <Text className="text-sm text-slate-700 mt-2" numberOfLines={3}>
          {document.ai_parsed.plain_language_summary}
        </Text>
      )}
      {(document.ai_parsed?.flags ?? []).length > 0 && (
        <View className="mt-2 bg-amber-50 rounded-lg px-3 py-1">
          <Text className="text-xs text-amber-700">
            {document.ai_parsed!.flags.join(' · ')}
          </Text>
        </View>
      )}
    </View>
  )
}
