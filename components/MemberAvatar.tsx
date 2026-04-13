// Session 03 will build the full MemberAvatar with document count badge
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { useRouter } from 'expo-router'
import type { FamilyMember } from '../types'

interface Props {
  member: FamilyMember
  lastDocumentDate?: string
}

export function MemberAvatar({ member, lastDocumentDate }: Props) {
  const router = useRouter()
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/member/${member.id}`)}
      className="items-center mx-3"
    >
      <View className="w-16 h-16 rounded-full bg-sky-100 items-center justify-center border-2 border-sky-200">
        {member.avatar_url ? (
          <Image source={{ uri: member.avatar_url }} className="w-full h-full rounded-full" />
        ) : (
          <Text className="text-sky-700 font-bold text-lg">{initials}</Text>
        )}
      </View>
      <Text className="text-xs font-medium text-slate-700 mt-1" numberOfLines={1}>
        {member.name}
      </Text>
      <Text className="text-xs text-slate-400">{member.relation}</Text>
      {lastDocumentDate && (
        <Text className="text-xs text-slate-300">{lastDocumentDate}</Text>
      )}
    </TouchableOpacity>
  )
}
