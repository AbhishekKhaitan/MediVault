import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFamilyStore } from '../../../stores/familyStore'
import { useDocumentStore } from '../../../stores/documentStore'
import { useMedicationStore } from '../../../stores/medicationStore'
import { getHealthMetricsForMember } from '../../../lib/api'
import { DocumentCard } from '../../../components/DocumentCard'
import { TrendChart } from '../../../components/TrendChart'
import { MedicationReminder } from '../../../components/MedicationReminder'
import { logMedicationTaken } from '../../../lib/api'
import type { HealthMetric } from '../../../types'

type Tab = 'timeline' | 'trends' | 'medications'

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const { members } = useFamilyStore()
  const { documents, loadDocumentsForMember } = useDocumentStore()
  const { medications, todaysLogs, loadMedications, loadTodaysLogs } = useMedicationStore()

  const [activeTab, setActiveTab] = useState<Tab>('timeline')
  const [metrics, setMetrics] = useState<Record<string, HealthMetric[]>>({})
  const [refreshing, setRefreshing] = useState(false)

  const member = members.find((m) => m.id === id)
  const memberDocs = documents[id] ?? []
  const memberMeds = medications[id] ?? []
  const memberLogs = todaysLogs[id] ?? []

  // ─── Load all data for this member ─────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!id) return
    await Promise.all([
      loadDocumentsForMember(id),
      loadMedications(id),
      loadTodaysLogs(id),
    ])
    // Load grouped health metrics for trend charts
    const allMetrics = await getHealthMetricsForMember(id)
    const grouped: Record<string, HealthMetric[]> = {}
    for (const m of allMetrics) {
      if (!grouped[m.metric_name]) grouped[m.metric_name] = []
      grouped[m.metric_name].push(m)
    }
    setMetrics(grouped)
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }, [loadAll])

  // ─── Medication log handler ─────────────────────────────────────────────────
  const handleMedicationLog = async (medicationId: string, taken: boolean) => {
    if (!id) return
    const today = new Date().toISOString().split('T')[0]
    await logMedicationTaken({
      medication_id: medicationId,
      member_id: id,
      taken,
      taken_at: taken ? new Date().toISOString() : null,
      scheduled_time: new Date().toTimeString().slice(0, 5),
      log_date: today,
    })
    loadTodaysLogs(id)
  }

  if (!member) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator color="#0EA5E9" />
      </SafeAreaView>
    )
  }

  // Compute age from date_of_birth
  const age = member.date_of_birth
    ? Math.floor((Date.now() - new Date(member.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>

      {/* ── Header ── */}
      <View className="bg-white px-6 pt-4 pb-4 border-b border-slate-100">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-9 h-9 items-center justify-center rounded-full bg-slate-100 mr-3"
          >
            <Ionicons name="arrow-back" size={18} color="#475569" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 flex-1">{member.name}</Text>
        </View>

        {/* Member profile card */}
        <View className="flex-row items-center gap-4">
          <View className="w-16 h-16 rounded-full bg-sky-100 items-center justify-center">
            <Text className="text-sky-700 font-bold text-xl">
              {member.name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <View className="flex-row gap-2 flex-wrap">
              <InfoChip label={member.relation} />
              {member.blood_group && <InfoChip label={member.blood_group} danger />}
              {age !== null && <InfoChip label={`${age} yrs`} />}
            </View>
            {(member.known_allergies ?? []).length > 0 && (
              <Text className="text-red-500 text-xs mt-1.5">
                ⚠ Allergic to: {member.known_allergies.join(', ')}
              </Text>
            )}
          </View>
        </View>

        {/* Stats row */}
        <View className="flex-row mt-4 gap-3">
          <StatCard value={memberDocs.length} label="Documents" />
          <StatCard value={memberMeds.filter(m => m.is_active).length} label="Active Meds" />
          <StatCard value={Object.keys(metrics).length} label="Metrics tracked" />
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View className="flex-row bg-white border-b border-slate-100">
        {(['timeline', 'trends', 'medications'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === tab ? 'border-sky-500' : 'border-transparent'
            }`}
          >
            <Text className={`text-sm font-semibold capitalize ${
              activeTab === tab ? 'text-sky-500' : 'text-slate-400'
            }`}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tab content ── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />}
      >
        {/* ── Timeline tab ── */}
        {activeTab === 'timeline' && (
          <View>
            {memberDocs.length === 0 ? (
              <EmptyState
                icon="document-outline"
                title="No documents yet"
                subtitle="Upload a lab report or prescription to get started"
                onAction={() => router.push('/(app)/upload')}
                actionLabel="Upload first document"
              />
            ) : (
              memberDocs.map((doc) => <DocumentCard key={doc.id} document={doc} />)
            )}
          </View>
        )}

        {/* ── Trends tab ── */}
        {activeTab === 'trends' && (
          <View>
            {Object.keys(metrics).length === 0 ? (
              <EmptyState
                icon="stats-chart-outline"
                title="No metrics yet"
                subtitle="Upload a lab report and we'll track your values over time"
              />
            ) : (
              Object.entries(metrics).map(([name, data]) => (
                <TrendChart key={name} metricName={name} metrics={data} />
              ))
            )}
          </View>
        )}

        {/* ── Medications tab ── */}
        {activeTab === 'medications' && (
          <View>
            {memberMeds.length === 0 ? (
              <EmptyState
                icon="medical-outline"
                title="No medications"
                subtitle="Upload a prescription and medications will appear here automatically"
              />
            ) : (
              memberMeds.map((med) => {
                const log = memberLogs.find((l) => l.medication_id === med.id)
                return (
                  <MedicationReminder
                    key={med.id}
                    medication={med}
                    taken={log?.taken}
                    onTaken={(taken) => handleMedicationLog(med.id, taken)}
                  />
                )
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Small reusable sub-components ───────────────────────────────────────────

function InfoChip({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <View className={`px-2.5 py-0.5 rounded-full ${danger ? 'bg-red-50' : 'bg-slate-100'}`}>
      <Text className={`text-xs font-semibold ${danger ? 'text-red-600' : 'text-slate-600'}`}>{label}</Text>
    </View>
  )
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 bg-slate-50 rounded-xl p-3 items-center border border-slate-100">
      <Text className="text-2xl font-bold text-slate-900">{value}</Text>
      <Text className="text-xs text-slate-400 text-center mt-0.5">{label}</Text>
    </View>
  )
}

function EmptyState({
  icon, title, subtitle, onAction, actionLabel,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  title: string
  subtitle: string
  onAction?: () => void
  actionLabel?: string
}) {
  return (
    <View className="items-center py-16">
      <Ionicons name={icon} size={48} color="#CBD5E1" />
      <Text className="text-slate-600 font-semibold text-base mt-4">{title}</Text>
      <Text className="text-slate-400 text-sm text-center mt-1 px-8">{subtitle}</Text>
      {onAction && (
        <TouchableOpacity onPress={onAction} className="mt-5 bg-sky-500 px-6 py-2.5 rounded-full">
          <Text className="text-white font-semibold text-sm">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
