// Settings screen
import { View, Text, TouchableOpacity } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'expo-router'

export default function SettingsScreen() {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  return (
    <View className="flex-1 bg-slate-50 pt-16 px-6">
      <Text className="text-2xl font-bold text-slate-900 mb-8">Settings</Text>
      <TouchableOpacity
        onPress={handleSignOut}
        className="bg-red-50 border border-red-200 rounded-xl p-4"
      >
        <Text className="text-red-600 font-semibold text-center">Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}
