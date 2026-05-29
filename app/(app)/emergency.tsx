import {
  View, Text, ScrollView, TouchableOpacity, Share, ActivityIndicator,
} from 'react-native'
import { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFamilyStore } from '../../stores/familyStore'
import { getActiveMedications } from '../../lib/api'
import { C } from '../../constants/theme'
import type { Medication } from '../../types'

export default function EmergencyScreen() {
  const { myProfile } = useFamilyStore()
  const [meds, setMeds] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (myProfile?.id) {
      getActiveMedications(myProfile.id).then(setMeds).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [myProfile?.id])

  const handleShare = async () => {
    if (!myProfile?.phone) return
    const phone = myProfile.phone.replace(/\D/g, '')
    const url = `https://medivault.in/e/${phone}`
    await Share.share({ message: `My emergency medical profile: ${url}`, url })
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.danger} size="large" />
      </SafeAreaView>
    )
  }

  return (
    // White background for maximum readability in real emergencies
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="medkit" size={22} color="#EF4444" />
          </View>
          <View>
            <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 }}>
              Emergency Card
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#0A0B14' }}>
              {myProfile?.name ?? 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Blood group — HUGE */}
        <View style={{
          backgroundColor: '#FEF2F2', borderWidth: 2, borderColor: '#FECACA',
          borderRadius: 20, padding: 24, marginBottom: 16, alignItems: 'center',
        }}>
          <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
            Blood Group
          </Text>
          {myProfile?.blood_group ? (
            <Text style={{ fontSize: 72, fontWeight: '900', color: '#EF4444', lineHeight: 80 }}>
              {myProfile.blood_group}
            </Text>
          ) : (
            <Text style={{ fontSize: 22, fontWeight: '600', color: '#FCA5A5' }}>Not set</Text>
          )}
        </View>

        {/* Allergies */}
        <View style={{ backgroundColor: '#FFF', borderWidth: 2, borderColor: '#FECACA', borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="warning" size={18} color="#EF4444" />
            <Text style={{ fontWeight: '800', fontSize: 15, color: '#DC2626' }}>Allergies</Text>
          </View>
          {(myProfile?.known_allergies ?? []).length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {myProfile!.known_allergies.map((a) => (
                <View key={a} style={{ backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
                  <Text style={{ color: '#B91C1C', fontWeight: '700', fontSize: 13 }}>{a}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>No known allergies</Text>
          )}
        </View>

        {/* Current medications */}
        <View style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="medical" size={18} color="#3B82F6" />
            <Text style={{ fontWeight: '800', fontSize: 15, color: '#1E293B' }}>Current Medications</Text>
          </View>
          {meds.length > 0 ? meds.map((med, i) => (
            <View key={med.id} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#F1F5F9' }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#60A5FA', marginTop: 5, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#1E293B', fontSize: 14 }}>{med.name}</Text>
                <Text style={{ color: '#64748B', fontSize: 13 }}>{med.dosage} · {med.frequency}</Text>
              </View>
            </View>
          )) : (
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>No active medications</Text>
          )}
        </View>

        {/* Share button */}
        {myProfile?.phone && (
          <TouchableOpacity
            onPress={handleShare}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
              backgroundColor: '#1E293B', borderRadius: 16, paddingVertical: 16, marginBottom: 12,
            }}
          >
            <Ionicons name="share-outline" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Share Emergency Link</Text>
          </TouchableOpacity>
        )}

        {myProfile?.phone && (
          <View style={{ backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <Ionicons name="link-outline" size={16} color="#3B82F6" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#1D4ED8', fontWeight: '700', fontSize: 13 }}>Emergency profile URL</Text>
              <Text style={{ color: '#3B82F6', fontSize: 12, marginTop: 2 }}>medivault.in/e/{myProfile.phone}</Text>
            </View>
          </View>
        )}

        <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
          Visible only when someone types your phone number.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
