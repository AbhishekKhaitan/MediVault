import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useFamilyStore } from '../../stores/familyStore'

export default function SettingsScreen() {
  const { family, myProfile, reset } = useFamilyStore()

  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            reset()                        // clear Zustand state first
            await supabase.auth.signOut()  // then destroy the session
            // _layout.tsx auth guard will redirect to login automatically
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="px-6 pt-4 pb-6">
        <Text className="text-2xl font-bold text-slate-900 mb-6">Settings</Text>

        {/* ── Profile card ── */}
        {myProfile && (
          <View className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <View className="flex-row items-center gap-4">
              <View className="w-14 h-14 rounded-full bg-sky-100 items-center justify-center">
                <Text className="text-sky-700 font-bold text-xl">
                  {myProfile.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-slate-900 text-base">{myProfile.name}</Text>
                <Text className="text-slate-500 text-sm">{myProfile.relation} · {myProfile.phone ?? 'No phone'}</Text>
                {myProfile.blood_group && (
                  <Text className="text-red-500 text-sm font-medium mt-0.5">
                    Blood group: {myProfile.blood_group}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── Family card ── */}
        {family && (
          <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-slate-400 font-medium uppercase tracking-wide">Family</Text>
                <Text className="text-slate-900 font-semibold mt-0.5">{family.name}</Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${
                family.subscription_status === 'active' ? 'bg-green-50' : 'bg-slate-100'
              }`}>
                <Text className={`text-xs font-semibold ${
                  family.subscription_status === 'active' ? 'text-green-600' : 'text-slate-500'
                }`}>
                  {family.subscription_status === 'active' ? 'Family Plan' : 'Free'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Danger zone ── */}
        <View className="mt-4">
          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center justify-between bg-white border border-red-100 rounded-2xl px-5 py-4"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text className="text-red-500 font-semibold">Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#FCA5A5" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}
