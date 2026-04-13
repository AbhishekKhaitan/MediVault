// Session 08 will build the public emergency web view
import { View, Text } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

export default function EmergencyAccessScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>()

  return (
    <View className="flex-1 items-center justify-center bg-white p-8">
      <Text className="text-3xl font-bold text-red-500 mb-4">Emergency Profile</Text>
      <Text className="text-slate-600">Loading profile for {phone}...</Text>
      <Text className="text-slate-400 mt-2">Session 08</Text>
    </View>
  )
}
