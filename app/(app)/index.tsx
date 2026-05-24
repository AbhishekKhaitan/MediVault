import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
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
import type { FamilyMember } from '../../types'

export default function HomeScreen() {
  const router = useRouter()
  const { family, members, myProfile, isLoading, loadFamily } = useFamilyStore()
  const { todaysLogs, loadTodaysLogs } = useMedicationStore()

  const [refreshing, setRefreshing] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [greeting, setGreeting] = useState('')

  // ─── Greeting based on time of day ─────────────────────────────────────────
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // ─── Load data on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    loadFamily()
  }, [])

  // Load today's medication logs for each member
  useEffect(() => {
    members.forEach((m) => loadTodaysLogs(m.id))
  }, [members])

  // ─── Pull-to-refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadFamily()
    setRefreshing(false)
  }, [])

  // ─── Medication compliance indicator per member ─────────────────────────────
  // Returns: 'all' | 'some' | 'none' | 'unknown'
  const getComplianceStatus = (memberId: string): 'all' | 'some' | 'none' | 'unknown' => {
    const logs = todaysLogs[memberId] ?? []
    if (logs.length === 0) return 'unknown'
    const taken = logs.filter((l) => l.taken).length
    if (taken === logs.length) return 'all'
    if (taken === 0) return 'none'
    return 'some'
  }

  // ─── Sign out handler ────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // ─── Loading state ───────────────────────────────────────────────────────────
  if (isLoading && !family) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text className="text-slate-500 mt-3">Loading your family...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0EA5E9"
          />
        }
      >

        {/* ── Header ── */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
          <View>
            <Text className="text-slate-400 text-sm">{greeting},</Text>
            <Text className="text-2xl font-bold text-slate-900">
              {myProfile?.name.split(' ')[0] ?? 'there'} 👋
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSignOut}
            className="w-10 h-10 items-center justify-center rounded-full bg-white border border-slate-200"
          >
            <Ionicons name="log-out-outline" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* ── Family name pill ── */}
        {family && (
          <View className="mx-6 mb-6">
            <View className="flex-row items-center gap-2">
              <View className="bg-sky-50 border border-sky-100 rounded-full px-3 py-1 flex-row items-center gap-1">
                <Ionicons name="people" size={13} color="#0EA5E9" />
                <Text className="text-sky-600 text-xs font-medium">{family.name}</Text>
              </View>
              {family.subscription_status === 'active' && (
                <View className="bg-green-50 border border-green-100 rounded-full px-3 py-1">
                  <Text className="text-green-600 text-xs font-medium">Family Plan ✓</Text>
                </View>
              )}
              {family.subscription_status === 'free' && (
                <TouchableOpacity
                  onPress={() => router.push('/(app)/settings')}
                  className="bg-amber-50 border border-amber-100 rounded-full px-3 py-1"
                >
                  <Text className="text-amber-600 text-xs font-medium">Free plan · Upgrade</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Family members section ── */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between px-6 mb-4">
            <Text className="text-lg font-bold text-slate-900">Family Members</Text>
            {myProfile?.is_admin && (
              <TouchableOpacity
                onPress={() => {
                  if (family?.subscription_status !== 'active' && members.length >= 1) {
                    router.push('/(app)/paywall')
                  } else {
                    setShowAddMember(true)
                  }
                }}
                className="flex-row items-center gap-1 bg-sky-500 rounded-full px-3 py-1.5"
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text className="text-white text-xs font-semibold">Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {members.length === 0 ? (
            /* ── Empty state ── */
            <View className="mx-6 bg-white rounded-2xl border border-dashed border-slate-300 p-8 items-center">
              <Ionicons name="people-outline" size={40} color="#CBD5E1" />
              <Text className="text-slate-500 font-medium mt-3 text-center">No family members yet</Text>
              <Text className="text-slate-400 text-sm text-center mt-1">
                Tap "Add" to bring your family in
              </Text>
            </View>
          ) : (
            /* ── Avatar scroll grid ── */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24 }}
            >
              <View className="flex-row gap-4">
                {members.map((member) => (
                  <MemberAvatar
                    key={member.id}
                    member={member}
                    complianceStatus={getComplianceStatus(member.id)}
                    isMe={member.id === myProfile?.id}
                  />
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* ── Quick actions ── */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-bold text-slate-900 mb-3">Quick Actions</Text>
          <View className="flex-row gap-3">
            <QuickActionCard
              icon="camera"
              label="Scan Report"
              color="#0EA5E9"
              bgColor="#F0F9FF"
              onPress={() => router.push('/(app)/upload')}
            />
            <QuickActionCard
              icon="medkit"
              label="Emergency"
              color="#EF4444"
              bgColor="#FFF1F2"
              onPress={() => router.push('/(app)/emergency')}
            />
            <QuickActionCard
              icon="stats-chart"
              label="Trends"
              color="#8B5CF6"
              bgColor="#F5F3FF"
              onPress={() => members[0] && router.push(`/(app)/member/${members[0].id}`)}
            />
          </View>
        </View>

        {/* ── Today's medication summary ── */}
        {members.some((m) => (todaysLogs[m.id] ?? []).length > 0) && (
          <View className="px-6 mb-6">
            <Text className="text-lg font-bold text-slate-900 mb-3">Today's Medications</Text>
            <View className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {members
                .filter((m) => (todaysLogs[m.id] ?? []).length > 0)
                .map((member, i, arr) => {
                  const logs = todaysLogs[member.id] ?? []
                  const taken = logs.filter((l) => l.taken).length
                  const total = logs.length
                  return (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => router.push(`/(app)/member/${member.id}`)}
                      className={`flex-row items-center px-4 py-3 ${
                        i < arr.length - 1 ? 'border-b border-slate-100' : ''
                      }`}
                    >
                      <View className="w-8 h-8 rounded-full bg-sky-100 items-center justify-center mr-3">
                        <Text className="text-sky-700 text-xs font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text className="flex-1 text-slate-800 font-medium">{member.name}</Text>
                      <View className="flex-row items-center gap-1.5">
                        <Text className={`text-sm font-semibold ${
                          taken === total ? 'text-green-600' : taken === 0 ? 'text-red-500' : 'text-amber-500'
                        }`}>
                          {taken}/{total}
                        </Text>
                        <Ionicons
                          name={taken === total ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={taken === total ? '#22C55E' : taken === 0 ? '#EF4444' : '#F59E0B'}
                        />
                      </View>
                    </TouchableOpacity>
                  )
                })}
            </View>
          </View>
        )}

        {/* ── Bottom spacer for FAB ── */}
        <View className="h-24" />
      </ScrollView>

      {/* ── Floating Action Button — Upload ── */}
      <TouchableOpacity
        onPress={() => router.push('/(app)/upload')}
        className="absolute bottom-6 right-6 w-16 h-16 bg-sky-500 rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 6 }}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* ── Add Member Sheet ── */}
      {family && (
        <AddMemberSheet
          visible={showAddMember}
          familyId={family.id}
          onClose={() => setShowAddMember(false)}
          onAdded={() => {
            setShowAddMember(false)
            loadFamily()
          }}
        />
      )}

    </SafeAreaView>
  )
}

// ─── Quick Action Card ────────────────────────────────────────────────────────
function QuickActionCard({
  icon,
  label,
  color,
  bgColor,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  color: string
  bgColor: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 rounded-2xl p-4 items-center"
      style={{ backgroundColor: bgColor }}
    >
      <Ionicons name={icon} size={28} color={color} />
      <Text className="text-xs font-semibold mt-2" style={{ color }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}
