import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFamilyStore } from '../../stores/familyStore'
import { initiateSubscription } from '../../lib/api'

type Plan = 'monthly' | 'yearly'

const FEATURES = [
  { label: 'Family members',        free: '1 member',      pro: 'Unlimited' },
  { label: 'Document storage',      free: '20 documents',  pro: 'Unlimited' },
  { label: 'AI report parsing',     free: false,           pro: true },
  { label: 'Health trend charts',   free: false,           pro: true },
  { label: 'Medication reminders',  free: true,            pro: true },
  { label: 'Emergency access card', free: true,            pro: true },
  { label: 'Multi-device sync',     free: true,            pro: true },
]

export default function PaywallScreen() {
  const router = useRouter()
  const { family, refreshFamily, isPro } = useFamilyStore()
  const [plan, setPlan] = useState<Plan>('yearly')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Auto-dismiss if subscription activates (e.g. user returns from browser)
  useEffect(() => {
    if (isPro()) router.back()
  }, [family?.subscription_status])

  const handleSubscribe = async () => {
    if (!family) return
    setLoading(true)
    try {
      const { short_url } = await initiateSubscription(plan, family.id)
      await Linking.openURL(short_url)
    } catch {
      Alert.alert('Error', 'Could not start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshFamily()
    setRefreshing(false)
    if (isPro()) {
      Alert.alert('Activated!', 'Your Family Plan is now active.', [
        { text: 'Continue', onPress: () => router.back() },
      ])
    } else {
      Alert.alert('Not yet', 'Payment not confirmed yet. Complete checkout and try again.')
    }
  }

  const monthlyPrice = 49
  const yearlyPrice = 449
  const yearlyMonthly = Math.round(yearlyPrice / 12)
  const savingsPct = Math.round((1 - yearlyMonthly / monthlyPrice) * 100)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={{ backgroundColor: '#0EA5E9', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="shield-checkmark" size={32} color="#fff" />
            </View>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' }}>
              MediVault Family Plan
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center', marginTop: 6 }}>
              Full access for your entire family's health journey
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>

          {/* ── Plan toggle ── */}
          <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 14, padding: 4, marginBottom: 20 }}>
            {(['monthly', 'yearly'] as Plan[]).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPlan(p)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 11,
                  alignItems: 'center',
                  backgroundColor: plan === p ? '#fff' : 'transparent',
                  shadowColor: plan === p ? '#000' : 'transparent',
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: plan === p ? 2 : 0,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: plan === p ? '#0F172A' : '#64748B' }}>
                  {p === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
                {p === 'yearly' && (
                  <Text style={{ fontSize: 10, color: '#16A34A', fontWeight: '700', marginTop: 1 }}>
                    Save {savingsPct}%
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Price card ── */}
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 2, borderColor: '#0EA5E9', alignItems: 'center' }}>
            {plan === 'monthly' ? (
              <>
                <Text style={{ fontSize: 42, fontWeight: '800', color: '#0F172A' }}>
                  ₹49
                </Text>
                <Text style={{ color: '#64748B', fontSize: 14 }}>per month</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 42, fontWeight: '800', color: '#0F172A' }}>
                  ₹449
                </Text>
                <Text style={{ color: '#64748B', fontSize: 14 }}>
                  per year · ₹{yearlyMonthly}/mo billed annually
                </Text>
                <View style={{ backgroundColor: '#DCFCE7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 }}>
                  <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '700' }}>
                    You save ₹{(monthlyPrice * 12) - yearlyPrice} vs monthly
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* ── Feature comparison ── */}
          <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
            {/* Header row */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Feature</Text>
              <Text style={{ width: 60, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Free</Text>
              <Text style={{ width: 60, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pro</Text>
            </View>
            {FEATURES.map((f, i) => (
              <View
                key={f.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: i < FEATURES.length - 1 ? 1 : 0,
                  borderBottomColor: '#F1F5F9',
                }}
              >
                <Text style={{ flex: 1, fontSize: 13, color: '#374151' }}>{f.label}</Text>
                <View style={{ width: 60, alignItems: 'center' }}>
                  {typeof f.free === 'string' ? (
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600', textAlign: 'center' }}>{f.free}</Text>
                  ) : f.free ? (
                    <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                  ) : (
                    <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                  )}
                </View>
                <View style={{ width: 60, alignItems: 'center' }}>
                  {typeof f.pro === 'string' ? (
                    <Text style={{ fontSize: 11, color: '#0EA5E9', fontWeight: '700', textAlign: 'center' }}>{f.pro}</Text>
                  ) : (
                    <Ionicons name="checkmark-circle" size={18} color="#0EA5E9" />
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* ── Subscribe CTA ── */}
          <TouchableOpacity
            onPress={handleSubscribe}
            disabled={loading}
            style={{
              backgroundColor: '#0EA5E9',
              borderRadius: 18,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {loading && <ActivityIndicator size="small" color="#fff" />}
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
              {loading
                ? 'Opening checkout...'
                : `Subscribe ${plan === 'monthly' ? '₹49/mo' : '₹449/yr'}`}
            </Text>
          </TouchableOpacity>

          {/* ── Already subscribed / refresh ── */}
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing}
            style={{ alignItems: 'center', paddingVertical: 12, marginBottom: 8 }}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#0EA5E9" />
            ) : (
              <Text style={{ color: '#64748B', fontSize: 13 }}>
                Already paid? Tap to refresh status
              </Text>
            )}
          </TouchableOpacity>

          <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', marginBottom: 32 }}>
            Payments processed securely by Razorpay. Cancel anytime from your Razorpay account.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
