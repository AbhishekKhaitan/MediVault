// Session 06 will build the full member profile with charts
import { View, Text } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-slate-900">Member Profile</Text>
      <Text className="text-slate-500 mt-2">ID: {id}</Text>
      <Text className="text-slate-400 mt-1">Session 06</Text>
    </View>
  )
}
