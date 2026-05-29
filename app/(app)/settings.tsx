import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useFamilyStore } from '../../stores/familyStore'
import { C } from '../../constants/theme'

function Row({ icon, label, color, onPress, right }: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string; color?: string; onPress?: () => void
  right?: React.ReactNode
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15,
      }}
    >
      <Ionicons name={icon} size={18} color={color ?? C.textSub} style={{ marginRight: 12 }} />
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: color ?? C.text }}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={14} color={C.textMute} />}
    </TouchableOpacity>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const { family, myProfile, reset } = useFamilyStore()
  const isPro = family?.subscription_status === 'active'

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { reset(); await supabase.auth.signOut() } },
    ])
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 24 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginHorizontal: 24, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  )

  const Divider = () => <View style={{ height: 1, backgroundColor: C.border, marginLeft: 46 }} />

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, letterSpacing: -0.3 }}>
          Settings
        </Text>

        {/* Profile */}
        {myProfile && (
          <Section title="Profile">
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <View style={{
                width: 50, height: 50, borderRadius: 25,
                backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center', marginRight: 14,
              }}>
                <Text style={{ color: C.accent, fontWeight: '800', fontSize: 18 }}>
                  {myProfile.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: C.text, fontSize: 15 }}>{myProfile.name}</Text>
                <Text style={{ color: C.textSub, fontSize: 13, marginTop: 2 }}>
                  {myProfile.relation}{myProfile.phone ? ` · ${myProfile.phone}` : ''}
                </Text>
                {myProfile.blood_group && (
                  <Text style={{ color: C.danger, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                    Blood: {myProfile.blood_group}
                  </Text>
                )}
              </View>
            </View>
          </Section>
        )}

        {/* Subscription */}
        {family && (
          <Section title="Subscription">
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 12, color: C.textMute }}>{family.name}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginTop: 2 }}>
                    {isPro ? 'Family Plan' : 'Free Plan'}
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                  backgroundColor: isPro ? C.successBg : C.warningBg,
                  borderWidth: 1, borderColor: isPro ? C.success : C.warning,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isPro ? C.success : C.warning }}>
                    {isPro ? 'Active ✓' : 'Limited'}
                  </Text>
                </View>
              </View>

              {isPro ? (
                family.subscription_end_date && (
                  <Text style={{ fontSize: 13, color: C.textSub }}>
                    Renews {new Date(family.subscription_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                )
              ) : (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {['1 member only', '20 docs max', 'No AI parsing', 'No trends'].map((l) => (
                      <View key={l} style={{ backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.border }}>
                        <Text style={{ color: C.textSub, fontSize: 12 }}>{l}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/(app)/paywall')}
                    style={{
                      backgroundColor: C.accent, borderRadius: 12, paddingVertical: 12,
                      alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={14} color={C.bg} />
                    <Text style={{ color: C.bg, fontWeight: '800', fontSize: 14 }}>Upgrade — ₹49/month</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Section>
        )}

        {/* App */}
        <Section title="App">
          <Row icon="shield-outline" label="Privacy Policy" />
          <Divider />
          <Row icon="document-text-outline" label="Terms of Service" />
          <Divider />
          <Row icon="information-circle-outline" label="Version 1.0.0"
            right={<Text style={{ color: C.textMute, fontSize: 13 }}>1.0.0</Text>}
          />
        </Section>

        {/* Sign out */}
        <Section title="Account">
          <Row icon="log-out-outline" label="Sign Out" color={C.danger} onPress={handleSignOut}
            right={<Ionicons name="chevron-forward" size={14} color={C.danger} />}
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}
