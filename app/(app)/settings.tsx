import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useFamilyStore } from '../../stores/familyStore'

export default function SettingsScreen() {
  const router = useRouter()
  const { family, myProfile, reset } = useFamilyStore()

  const isPro = family?.subscription_status === 'active'

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
            reset()
            await supabase.auth.signOut()
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
                <Text className="text-slate-500 text-sm">
                  {myProfile.relation} · {myProfile.phone ?? 'No phone'}
                </Text>
                {myProfile.blood_group && (
                  <Text className="text-red-500 text-sm font-medium mt-0.5">
                    Blood group: {myProfile.blood_group}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── Subscription card ── */}
        {family && (
          <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                  {family.name}
                </Text>
                <Text className="text-slate-900 font-semibold mt-0.5">
                  {isPro ? 'Family Plan' : 'Free Plan'}
                </Text>
              </View>
              <View
                className={`px-3 py-1 rounded-full ${isPro ? 'bg-green-50' : 'bg-amber-50'}`}
              >
                <Text
                  className={`text-xs font-semibold ${isPro ? 'text-green-600' : 'text-amber-600'}`}
                >
                  {isPro ? 'Active ✓' : 'Limited'}
                </Text>
              </View>
            </View>

            {isPro ? (
              <View>
                {family.subscription_end_date && (
                  <Text className="text-xs text-slate-400">
                    Renews{' '}
                    {new Date(family.subscription_end_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                )}
                <Text className="text-xs text-slate-400 mt-1">
                  Manage subscription via your Razorpay account
                </Text>
              </View>
            ) : (
              <View>
                <View className="flex-row gap-1 flex-wrap mb-3">
                  {['1 member only', '20 docs max', 'No AI parsing', 'No trend charts'].map((l) => (
                    <View key={l} className="bg-slate-100 rounded-full px-2 py-0.5">
                      <Text className="text-slate-500 text-xs">{l}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/(app)/paywall')}
                  className="bg-sky-500 rounded-xl py-2.5 items-center flex-row justify-center gap-1.5"
                >
                  <Ionicons name="shield-checkmark-outline" size={15} color="#fff" />
                  <Text className="text-white font-bold text-sm">
                    Upgrade — ₹49/month
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Danger zone ── */}
        <View className="mt-2">
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
