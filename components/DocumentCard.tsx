import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C } from '../constants/theme'
import type { Document } from '../types'

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  lab_report:        { icon: '🧪', color: C.cyan,    bg: C.cyanBg },
  prescription:      { icon: '💊', color: C.accent,  bg: C.accentBg },
  discharge_summary: { icon: '🏥', color: C.warning, bg: C.warningBg },
  xray:              { icon: '🩻', color: C.textSub, bg: C.card },
  other:             { icon: '📄', color: C.textSub, bg: C.card },
}

export function DocumentCard({ document }: { document: Document }) {
  const meta = TYPE_META[document.document_type] ?? TYPE_META.other
  const isPending = document.parsing_status === 'pending'
  const isFailed  = document.parsing_status === 'failed'

  return (
    <View style={{
      backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
      borderColor: C.border, padding: 16, marginBottom: 10,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon */}
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: C.text, fontSize: 14, marginBottom: 2 }} numberOfLines={1}>
            {document.title ?? document.document_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {document.document_date && (
              <Text style={{ color: C.textSub, fontSize: 12 }}>{document.document_date}</Text>
            )}
            {document.doctor_name && (
              <Text style={{ color: C.textMute, fontSize: 12 }}>· Dr. {document.doctor_name}</Text>
            )}
          </View>
        </View>

        {/* Status badge */}
        {isPending && (
          <View style={{ backgroundColor: C.warningBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.warning + '40' }}>
            <Text style={{ fontSize: 11, color: C.warning, fontWeight: '600' }}>Parsing…</Text>
          </View>
        )}
        {isFailed && (
          <View style={{ backgroundColor: C.dangerBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, color: C.danger, fontWeight: '600' }}>Failed</Text>
          </View>
        )}
      </View>

      {/* AI summary */}
      {document.ai_parsed?.plain_language_summary && (
        <Text style={{ color: C.textSub, fontSize: 13, marginTop: 12, lineHeight: 20 }} numberOfLines={3}>
          {document.ai_parsed.plain_language_summary}
        </Text>
      )}

      {/* Flags */}
      {(document.ai_parsed?.flags ?? []).length > 0 && (
        <View style={{
          marginTop: 10, backgroundColor: C.warningBg, borderRadius: 8,
          paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.warning + '30',
          flexDirection: 'row', alignItems: 'center', gap: 6,
        }}>
          <Ionicons name="warning-outline" size={13} color={C.warning} />
          <Text style={{ fontSize: 12, color: C.warning, flex: 1 }} numberOfLines={2}>
            {document.ai_parsed!.flags.join(' · ')}
          </Text>
        </View>
      )}
    </View>
  )
}
