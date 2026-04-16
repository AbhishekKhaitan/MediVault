import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native'
import { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFamilyStore } from '../../stores/familyStore'
import { useMedicationStore } from '../../stores/medicationStore'
import { getActiveMedications } from '../../lib/api'
import type { Medication } from '../../types'

export default function EmergencyScreen() {
  const { myProfile } = useFamilyStore()
  const [activeMeds, setActiveMeds] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (myProfile?.id) {
      getActiveMedications(myProfile.id)
        .then(setActiveMeds)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [myProfile?.id])

  const handleShare = async () => {
    if (!myProfile?.phone) return
    const phone = myProfile.phone.replace(/\D/g, '')
    const url = `https://medivault.in/e/${phone}`
    await Share.share({
      message: `My emergency medical profile: ${url}`,
      url,
    })
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#EF4444" size="large" />
      </SafeAreaView>
    )
  }

  return (
    // Full-screen white — no navigation chrome, maximum readability in emergencies
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>

        {/* ── Header ── */}
        <View className="flex-row items-center gap-3 mb-8">
          <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center">
            <Ionicons name="medkit" size={24} color="#EF4444" />
          </View>
          <View>
            <Text className="text-xs text-red-400 font-semibold uppercase tracking-widest">Emergency Card</Text>
            <Text className="text-2xl font-bold text-slate-900">
              {myProfile?.name ?? 'Unknown'}
            </Text>
          </View>
        </View>

        {/* ── Blood group — shown HUGE ── */}
        <View className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 mb-5 items-center">
          <Text className="text-red-400 text-sm font-semibold uppercase tracking-widest mb-1">Blood Group</Text>
          {myProfile?.blood_group ? (
            <Text className="text-red-600 font-black" style={{ fontSize: 64, lineHeight: 72 }}>
              {myProfile.blood_group}
            </Text>
          ) : (
            <Text className="text-red-300 text-2xl font-semibold">Not set</Text>
          )}
        </View>

        {/* ── Allergies — red text, hard to miss ── */}
        <View className="bg-white border-2 border-red-200 rounded-2xl p-5 mb-5">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="warning" size={18} color="#EF4444" />
            <Text className="text-red-500 font-bold text-base">Allergies</Text>
          </View>
          {(myProfile?.known_allergies ?? []).length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {myProfile!.known_allergies.map((a) => (
                <View key={a} className="bg-red-100 border border-red-300 rounded-full px-3 py-1">
                  <Text className="text-red-700 font-semibold text-sm">{a}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-slate-400">No known allergies</Text>
          )}
        </View>

        {/* ── Active medications ── */}
        <View className="bg-white border border-slate-200 rounded-2xl p-5 mb-5">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="medical" size={18} color="#0EA5E9" />
            <Text className="text-slate-900 font-bold text-base">Current Medications</Text>
          </View>
          {activeMeds.length > 0 ? (
            activeMeds.map((med, i) => (
              <View key={med.id} className={`flex-row items-start py-2 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                <View className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 mr-3" />
                <View className="flex-1">
                  <Text className="text-slate-900 font-semibold">{med.name}</Text>
                  <Text className="text-slate-500 text-sm">{med.dosage} · {med.frequency}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-slate-400">No active medications</Text>
          )}
        </View>

        {/* ── Share button ── */}
        {myProfile?.phone && (
          <TouchableOpacity
            onPress={handleShare}
            className="flex-row items-center justify-center gap-3 bg-slate-900 rounded-2xl py-4 mb-4"
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text className="text-white font-semibold text-base">Share Emergency Link</Text>
          </TouchableOpacity>
        )}

        {/* ── Phone link info ── */}
        {myProfile?.phone && (
          <View className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex-row gap-3 mb-4">
            <Ionicons name="link-outline" size={18} color="#0EA5E9" />
            <View className="flex-1">
              <Text className="text-sky-700 font-semibold text-sm">Emergency profile URL</Text>
              <Text className="text-sky-500 text-xs mt-0.5 font-mono">
                medivault.in/e/{myProfile.phone}
              </Text>
              <Text className="text-sky-400 text-xs mt-1">
                Give your phone number to a receptionist — they can pull your full profile instantly.
              </Text>
            </View>
          </View>
        )}

        {/* ── Opt-out notice ── */}
        <Text className="text-slate-400 text-xs text-center">
          Your emergency profile is visible only when someone types your phone number.{'\n'}
          Turn off in Settings → Emergency Access.
        </Text>

      </ScrollView>
    </SafeAreaView>
  )
}
