import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFamilyStore } from '../../stores/familyStore'
import { useMedicationStore } from '../../stores/medicationStore'
import { MemberAvatar } from '../../components/MemberAvatar'
import { AddMemberSheet } from '../../components/AddMemberSheet'
import { supabase } from '../../lib/supabase'
import { C } from '../../constants/theme'
import type { FamilyMember } from '../../types'

export default function HomeScreen() {
  const router = useRouter()
  const { family, members, myProfile, isLoading, loadFamily } = useFamilyStore()
  const { todaysLogs, loadTodaysLogs } = useMedicationStore()

  const [refreshing, setRefreshing] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  useEffect(() => { loadFamily() }, [])
  useEffect(() => { members.forEach((m) => loadTodaysLogs(m.id)) }, [members])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadFamily()
    setRefreshing(false)
  }, [])

  const compliance = (memberId: string): 'all' | 'some' | 'none' | 'unknown' => {
    const logs = todaysLogs[memberId] ?? []
    if (!logs.length) return 'unknown'
    const taken = logs.filter((l) => l.taken).length
    return taken === logs.length ? 'all' : taken === 0 ? 'none' : 'some'
  }

  const isPro = family?.subscription_status === 'active'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
      >

        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 }}>
          <View>
            <Text style={{ color: C.textSub, fontSize: 13 }}>{greeting},</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.3 }}>
              {myProfile?.name.split(' ')[0] ?? 'there'} 👋
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => supabase.auth.signOut()}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="log-out-outline" size={18} color={C.textSub} />
          </TouchableOpacity>
        </View>

        {/* ── Plan pill ── */}
        {family && (
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border,
                paddingHorizontal: 12, paddingVertical: 5,
              }}>
                <Ionicons name="people" size={12} color={C.accent} />
                <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>{family.name}</Text>
              </View>
              {isPro ? (
                <View style={{ backgroundColor: C.successBg, borderRadius: 20, borderWidth: 1, borderColor: C.success, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: C.success, fontSize: 11, fontWeight: '700' }}>Pro ✓</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push('/(app)/paywall')}
                  style={{ backgroundColor: C.warningBg, borderRadius: 20, borderWidth: 1, borderColor: C.warning, paddingHorizontal: 10, paddingVertical: 5 }}
                >
                  <Text style={{ color: C.warning, fontSize: 11, fontWeight: '700' }}>Free · Upgrade</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Quick actions ── */}
        <View style={{ paddingHorizontal: 24, marginBottom: 28 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <QACard icon="camera" label="Scan" color={C.accent} bg={C.accentBg} onPress={() => router.push('/(app)/upload')} />
            <QACard icon="medkit" label="Emergency" color={C.danger} bg={C.dangerBg} onPress={() => router.push('/(app)/emergency')} />
            <QACard icon="stats-chart" label="Trends" color={C.cyan} bg={C.cyanBg} onPress={() => members[0] && router.push(`/(app)/member/${members[0].id}`)} />
          </View>
        </View>

        {/* ── Family members ── */}
        <View style={{ marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Family Members
            </Text>
            {myProfile?.is_admin && (
              <TouchableOpacity
                onPress={() => {
                  if (!isPro && members.length >= 1) router.push('/(app)/paywall')
                  else setShowAddMember(true)
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: C.accentBg, borderRadius: 16,
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderWidth: 1, borderColor: C.accent,
                }}
              >
                <Ionicons name="add" size={14} color={C.accent} />
                <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700' }}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {members.length === 0 ? (
            <View style={{
              marginHorizontal: 24, backgroundColor: C.surface, borderRadius: 16,
              borderWidth: 1, borderColor: C.border, borderStyle: 'dashed',
              padding: 32, alignItems: 'center',
            }}>
              <Ionicons name="people-outline" size={36} color={C.textMute} />
              <Text style={{ color: C.textSub, fontWeight: '600', marginTop: 10 }}>No family members yet</Text>
              <Text style={{ color: C.textMute, fontSize: 13, marginTop: 4 }}>Tap "Add" to bring your family in</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                {members.map((m) => (
                  <MemberAvatar key={m.id} member={m} complianceStatus={compliance(m.id)} isMe={m.id === myProfile?.id} />
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* ── Today's medications ── */}
        {members.some((m) => (todaysLogs[m.id] ?? []).length > 0) && (
          <View style={{ paddingHorizontal: 24, marginBottom: 28 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
              Today's Medications
            </Text>
            <View style={{ backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
              {members
                .filter((m) => (todaysLogs[m.id] ?? []).length > 0)
                .map((m, i, arr) => {
                  const logs = todaysLogs[m.id] ?? []
                  const taken = logs.filter((l) => l.taken).length
                  const all = logs.length
                  const color = taken === all ? C.success : taken === 0 ? C.danger : C.warning
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => router.push(`/(app)/member/${m.id}`)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
                        borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: C.border,
                      }}
                    >
                      <View style={{
                        width: 34, height: 34, borderRadius: 17,
                        backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center', marginRight: 12,
                      }}>
                        <Text style={{ color: C.accent, fontSize: 13, fontWeight: '800' }}>
                          {m.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={{ flex: 1, color: C.text, fontWeight: '600', fontSize: 14 }}>{m.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color }}>{taken}/{all}</Text>
                        <Ionicons
                          name={taken === all ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16} color={color}
                        />
                      </View>
                    </TouchableOpacity>
                  )
                })}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        onPress={() => router.push('/(app)/upload')}
        style={{
          position: 'absolute', bottom: 24, right: 24,
          width: 58, height: 58, borderRadius: 29,
          backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
          shadowColor: C.accent, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color={C.bg} />
      </TouchableOpacity>

      {family && (
        <AddMemberSheet
          visible={showAddMember}
          familyId={family.id}
          onClose={() => setShowAddMember(false)}
          onAdded={() => { setShowAddMember(false); loadFamily() }}
        />
      )}
    </SafeAreaView>
  )
}

function QACard({ icon, label, color, bg, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string; color: string; bg: string; onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1, borderRadius: 16, padding: 16,
        backgroundColor: bg, alignItems: 'center',
        borderWidth: 1, borderColor: color + '40',
      }}
    >
      <Ionicons name={icon} size={26} color={color} />
      <Text style={{ fontSize: 12, fontWeight: '700', marginTop: 8, color }}>{label}</Text>
    </TouchableOpacity>
  )
}
