import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
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
import { AddMedicationSheet } from '../../../components/AddMedicationSheet'
import { C } from '../../../constants/theme'
import type { HealthMetric } from '../../../types'

type Tab = 'timeline' | 'trends' | 'medications'

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { members, family, isPro } = useFamilyStore()
  const { documents, loadDocumentsForMember } = useDocumentStore()
  const { medications, todaysLogs, loadMedications, loadTodaysLogs, logMedication, setReminderTimes, addMedication, removeMedication } = useMedicationStore()

  const [activeTab, setActiveTab] = useState<Tab>('timeline')
  const [metrics, setMetrics] = useState<Record<string, HealthMetric[]>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [showAddMed, setShowAddMed] = useState(false)

  const member = members.find((m) => m.id === id)
  const memberDocs = documents[id] ?? []
  const memberMeds = medications[id] ?? []
  const memberLogs = todaysLogs[id] ?? []

  const loadAll = useCallback(async () => {
    if (!id) return
    await Promise.all([loadDocumentsForMember(id), loadMedications(id), loadTodaysLogs(id)])
    const allMetrics = await getHealthMetricsForMember(id)
    const grouped: Record<string, HealthMetric[]> = {}
    for (const m of allMetrics) {
      if (!grouped[m.metric_name]) grouped[m.metric_name] = []
      grouped[m.metric_name].push(m)
    }
    setMetrics(grouped)
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadAll(); setRefreshing(false) }, [loadAll])

  if (!member) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} />
      </SafeAreaView>
    )
  }

  const age = member.date_of_birth
    ? Math.floor((Date.now() - new Date(member.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const TABS: Tab[] = ['timeline', 'trends', 'medications']

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>

      {/* Header */}
      <View style={{ backgroundColor: C.surface, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Ionicons name="arrow-back" size={18} color={C.textSub} />
          </TouchableOpacity>
          <Text style={{ fontSize: 19, fontWeight: '800', color: C.text, flex: 1 }}>{member.name}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.accent, fontWeight: '800', fontSize: 20 }}>{member.name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Chip label={member.relation} />
              {member.blood_group && <Chip label={member.blood_group} color={C.danger} bg={C.dangerBg} />}
              {age !== null && <Chip label={`${age} yrs`} />}
            </View>
            {(member.known_allergies ?? []).length > 0 && (
              <Text style={{ color: C.danger, fontSize: 12, marginTop: 5 }}>
                ⚠ Allergic to: {member.known_allergies.join(', ')}
              </Text>
            )}
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <StatBox value={memberDocs.length} label="Documents" />
          <StatBox value={memberMeds.filter((m) => m.is_active).length} label="Active Meds" />
          <StatBox value={Object.keys(metrics).length} label="Metrics" />
        </View>
      </View>

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border }}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1, paddingVertical: 12, alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab ? C.accent : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', textTransform: 'capitalize', color: activeTab === tab ? C.accent : C.textSub }}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {activeTab === 'timeline' && (
          memberDocs.length === 0
            ? <Empty icon="document-outline" title="No documents yet" sub="Upload a lab report or prescription" action={() => router.push('/(app)/upload')} actionLabel="Upload first document" />
            : memberDocs.map((doc) => <DocumentCard key={doc.id} document={doc} />)
        )}

        {activeTab === 'trends' && (
          !isPro()
            ? <ProGate onUpgrade={() => router.push('/(app)/paywall')} />
            : Object.keys(metrics).length === 0
              ? <Empty icon="stats-chart-outline" title="No metrics yet" sub="Upload a lab report to start tracking" />
              : Object.entries(metrics).map(([name, data]) => <TrendChart key={name} metricName={name} metrics={data} />)
        )}

        {activeTab === 'medications' && (
          <View>
            <TouchableOpacity onPress={() => setShowAddMed(true)} style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderWidth: 1, borderStyle: 'dashed', borderColor: C.accent + '60',
              backgroundColor: C.accentBg, borderRadius: 12, paddingVertical: 12, marginBottom: 14,
            }}>
              <Ionicons name="add-circle-outline" size={16} color={C.accent} />
              <Text style={{ color: C.accent, fontWeight: '700', fontSize: 13 }}>Add Medication Manually</Text>
            </TouchableOpacity>

            {memberMeds.length === 0
              ? <Empty icon="medical-outline" title="No medications" sub="Upload a prescription or add manually" />
              : memberMeds.map((med) => {
                  const log = memberLogs.find((l) => l.medication_id === med.id)
                  return (
                    <MedicationReminder
                      key={med.id} medication={med} taken={log?.taken}
                      onTaken={(taken) => logMedication(med.id, id!, taken)}
                      onUpdateTimes={(times) => setReminderTimes(med.id, id!, times, member.name)}
                      onRemove={() => removeMedication(med.id, id!)}
                    />
                  )
                })
            }
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {family && (
        <AddMedicationSheet
          visible={showAddMed} familyId={family.id} memberId={id!}
          onClose={() => setShowAddMed(false)} onAdded={addMedication}
        />
      )}
    </SafeAreaView>
  )
}

function Chip({ label, color, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: bg ?? C.card, borderWidth: 1, borderColor: (color ?? C.textSub) + '40' }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: color ?? C.textSub }}>{label}</Text>
    </View>
  )
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: C.text }}>{value}</Text>
      <Text style={{ fontSize: 10, color: C.textSub, marginTop: 1, textAlign: 'center' }}>{label}</Text>
    </View>
  )
}

function ProGate({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Ionicons name="lock-closed" size={28} color={C.accent} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, textAlign: 'center' }}>
        Trend charts are a Pro feature
      </Text>
      <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
        Track blood sugar, haemoglobin and more over time.
      </Text>
      <TouchableOpacity onPress={onUpgrade} style={{ marginTop: 20, backgroundColor: C.accent, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 }}>
        <Text style={{ color: C.bg, fontWeight: '800', fontSize: 14 }}>Upgrade · ₹49/mo</Text>
      </TouchableOpacity>
    </View>
  )
}

function Empty({ icon, title, sub, action, actionLabel }: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  title: string; sub: string; action?: () => void; actionLabel?: string
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 56 }}>
      <Ionicons name={icon} size={44} color={C.textMute} />
      <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, marginTop: 14 }}>{title}</Text>
      <Text style={{ color: C.textSub, fontSize: 13, textAlign: 'center', marginTop: 5, paddingHorizontal: 32, lineHeight: 20 }}>{sub}</Text>
      {action && (
        <TouchableOpacity onPress={action} style={{ marginTop: 18, backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}>
          <Text style={{ color: C.bg, fontWeight: '700', fontSize: 13 }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
