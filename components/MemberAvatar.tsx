import { View, Text, TouchableOpacity, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C } from '../constants/theme'
import type { FamilyMember } from '../types'

type ComplianceStatus = 'all' | 'some' | 'none' | 'unknown'

const DOT_COLOR: Record<ComplianceStatus, string> = {
  all: C.success, some: C.warning, none: C.danger, unknown: 'transparent',
}

// Deterministic avatar tint from name
const TINTS = [
  { bg: '#1E1B4B', text: '#818CF8' }, // indigo
  { bg: '#052917', text: '#34D399' }, // emerald
  { bg: '#2A1E05', text: '#FBBF24' }, // amber
  { bg: '#2D0A0A', text: '#F87171' }, // red
  { bg: '#042830', text: '#22D3EE' }, // cyan
  { bg: '#1F1035', text: '#C084FC' }, // purple
]

export function MemberAvatar({ member, complianceStatus = 'unknown', isMe }: {
  member: FamilyMember
  complianceStatus?: ComplianceStatus
  isMe?: boolean
}) {
  const router = useRouter()
  const initials = member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const { bg, text } = TINTS[member.name.charCodeAt(0) % TINTS.length]
  const dotColor = DOT_COLOR[complianceStatus]

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/member/${member.id}`)}
      activeOpacity={0.75}
      style={{ alignItems: 'center', width: 70 }}
    >
      <View style={{ position: 'relative' }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          {member.avatar_url ? (
            <Image source={{ uri: member.avatar_url }} style={{ width: 58, height: 58, borderRadius: 29 }} />
          ) : (
            <Text style={{ fontWeight: '800', fontSize: 18, color: text }}>{initials}</Text>
          )}
        </View>

        {isMe && (
          <View style={{
            position: 'absolute', top: -2, right: -2,
            width: 18, height: 18, borderRadius: 9,
            backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: C.bg,
          }}>
            <Ionicons name="person" size={8} color={C.bg} />
          </View>
        )}

        {complianceStatus !== 'unknown' && (
          <View style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 13, height: 13, borderRadius: 7,
            backgroundColor: dotColor, borderWidth: 2, borderColor: C.bg,
          }} />
        )}
      </View>

      <Text style={{ fontSize: 11, fontWeight: '600', color: C.text, marginTop: 7, textAlign: 'center' }} numberOfLines={1}>
        {member.name.split(' ')[0]}
      </Text>
      <Text style={{ fontSize: 10, color: C.textSub, textAlign: 'center' }} numberOfLines={1}>
        {member.relation}
      </Text>
    </TouchableOpacity>
  )
}
