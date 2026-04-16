import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { EmergencyProfile } from '../../types'

// ─── Public web page — no authentication ─────────────────────────────────────
// URL: medivault.in/e/9876543210
// Used by hospital receptionists to instantly pull a patient's emergency profile.
// Every access is logged server-side (see emergency-lookup edge function).

export default function EmergencyAccessScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const [profile, setProfile] = useState<EmergencyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!phone) return

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
    fetch(`${supabaseUrl}/functions/v1/emergency-lookup?phone=${phone}`, {
      headers: { 'Content-Type': 'application/json' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setProfile(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [phone])

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#EF4444" />
        <Text className="text-slate-500 mt-4">Loading emergency profile...</Text>
      </View>
    )
  }

  if (error || !profile) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={56} color="#CBD5E1" />
        <Text className="text-slate-700 font-bold text-xl mt-4 text-center">Profile not found</Text>
        <Text className="text-slate-400 text-sm text-center mt-2">
          {error ?? 'No emergency profile is linked to this number, or the patient has disabled emergency access.'}
        </Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>

      {/* ── Header ── */}
      <View className="items-center mb-8 pt-4">
        <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-3">
          <Ionicons name="medkit" size={32} color="#EF4444" />
        </View>
        <Text className="text-xs text-red-400 font-semibold uppercase tracking-widest">Emergency Medical Profile</Text>
        <Text className="text-3xl font-black text-slate-900 mt-1">{profile.name}</Text>
      </View>

      {/* ── Blood group — huge ── */}
      <View className="bg-red-50 border-2 border-red-300 rounded-3xl p-6 mb-6 items-center">
        <Text className="text-red-400 text-sm font-semibold uppercase tracking-widest">Blood Group</Text>
        <Text className="text-red-600 font-black mt-1" style={{ fontSize: 72, lineHeight: 80 }}>
          {profile.blood_group ?? '?'}
        </Text>
      </View>

      {/* ── Allergies ── */}
      <SectionCard
        icon="warning"
        iconColor="#EF4444"
        title="Allergies"
        danger
      >
        {profile.known_allergies.length > 0 ? (
          <View className="flex-row flex-wrap gap-2 mt-2">
            {profile.known_allergies.map((a) => (
              <View key={a} className="bg-red-100 border border-red-300 rounded-full px-3 py-1.5">
                <Text className="text-red-700 font-bold">{a}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-slate-400 mt-2">No known allergies on record</Text>
        )}
      </SectionCard>

      {/* ── Active medications ── */}
      <SectionCard icon="medical" iconColor="#0EA5E9" title="Current Medications">
        {profile.active_medications.length > 0 ? (
          profile.active_medications.map((m, i) => (
            <View key={i} className="flex-row items-start py-2 border-b border-slate-100 last:border-0">
              <View className="w-2 h-2 rounded-full bg-sky-400 mt-2 mr-3" />
              <View>
                <Text className="text-slate-900 font-semibold">{m.name}</Text>
                <Text className="text-slate-500 text-sm">{m.dosage} · {m.frequency}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-slate-400 mt-2">No active medications</Text>
        )}
      </SectionCard>

      {/* ── Recent summaries ── */}
      {profile.recent_summaries.length > 0 && (
        <SectionCard icon="document-text" iconColor="#8B5CF6" title="Recent Medical Notes">
          {profile.recent_summaries.map((s, i) => (
            <View key={i} className="mt-2 pt-2 border-t border-slate-100 first:border-0 first:mt-0 first:pt-0">
              <Text className="text-slate-600 text-sm leading-5">{s}</Text>
            </View>
          ))}
        </SectionCard>
      )}

      {/* ── Footer disclaimer ── */}
      <Text className="text-slate-400 text-xs text-center mt-6 leading-4">
        This information was provided by the patient via MediVault.{'\n'}
        Accessed: {new Date().toLocaleString('en-IN')}
      </Text>

    </ScrollView>
  )
}

function SectionCard({
  icon, iconColor, title, children, danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  iconColor: string
  title: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <View className={`border rounded-2xl p-5 mb-4 ${danger ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <View className="flex-row items-center gap-2 mb-1">
        <Ionicons name={icon} size={18} color={iconColor} />
        <Text className={`font-bold text-base ${danger ? 'text-red-600' : 'text-slate-900'}`}>{title}</Text>
      </View>
      {children}
    </View>
  )
}
