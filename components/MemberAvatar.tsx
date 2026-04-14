import { View, Text, TouchableOpacity, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { FamilyMember } from '../types'

type ComplianceStatus = 'all' | 'some' | 'none' | 'unknown'

interface Props {
  member: FamilyMember
  complianceStatus?: ComplianceStatus
  lastDocumentDate?: string
  isMe?: boolean
}

// ─── Compliance dot colors ────────────────────────────────────────────────────
// Shown bottom-right of the avatar — gives at-a-glance medication status
const COMPLIANCE_DOT: Record<ComplianceStatus, { bg: string; label: string }> = {
  all:     { bg: '#22C55E', label: 'All taken' },
  some:    { bg: '#F59E0B', label: 'Partially taken' },
  none:    { bg: '#EF4444', label: 'None taken' },
  unknown: { bg: 'transparent', label: '' },
}

export function MemberAvatar({ member, complianceStatus = 'unknown', lastDocumentDate, isMe }: Props) {
  const router = useRouter()

  // Generate 2-letter initials from the member's full name
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const dot = COMPLIANCE_DOT[complianceStatus]

  // Pick avatar background colour deterministically from the member's name
  // so it's always the same colour for the same person across sessions
  const avatarColors = [
    { bg: '#DBEAFE', text: '#1D4ED8' }, // blue
    { bg: '#D1FAE5', text: '#065F46' }, // green
    { bg: '#FEF3C7', text: '#92400E' }, // amber
    { bg: '#FCE7F3', text: '#9D174D' }, // pink
    { bg: '#EDE9FE', text: '#5B21B6' }, // violet
    { bg: '#FFEDD5', text: '#C2410C' }, // orange
  ]
  const colorIndex = member.name.charCodeAt(0) % avatarColors.length
  const { bg: avatarBg, text: avatarText } = avatarColors[colorIndex]

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/member/${member.id}`)}
      activeOpacity={0.7}
      className="items-center"
      style={{ width: 72 }}
    >
      {/* ── Avatar circle ── */}
      <View className="relative">
        <View
          className="w-16 h-16 rounded-full items-center justify-center"
          style={{ backgroundColor: avatarBg }}
        >
          {member.avatar_url ? (
            <Image
              source={{ uri: member.avatar_url }}
              className="w-full h-full rounded-full"
            />
          ) : (
            <Text className="font-bold text-lg" style={{ color: avatarText }}>
              {initials}
            </Text>
          )}
        </View>

        {/* ── "Me" badge ── */}
        {isMe && (
          <View className="absolute -top-1 -right-1 bg-sky-500 rounded-full w-5 h-5 items-center justify-center">
            <Ionicons name="person" size={10} color="#fff" />
          </View>
        )}

        {/* ── Medication compliance dot (bottom-right) ── */}
        {complianceStatus !== 'unknown' && (
          <View
            className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: dot.bg }}
          />
        )}
      </View>

      {/* ── Name ── */}
      <Text
        className="text-xs font-medium text-slate-700 mt-1.5 text-center"
        numberOfLines={1}
      >
        {member.name.split(' ')[0]}
      </Text>

      {/* ── Relation ── */}
      <Text className="text-xs text-slate-400 text-center" numberOfLines={1}>
        {member.relation}
      </Text>

      {/* ── Last document date ── */}
      {lastDocumentDate && (
        <Text className="text-xs text-slate-300 text-center mt-0.5" numberOfLines={1}>
          {lastDocumentDate}
        </Text>
      )}
    </TouchableOpacity>
  )
}
