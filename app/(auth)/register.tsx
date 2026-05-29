import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { registerFamilyAndFirstMember } from '../../lib/api'
import { registerForPushNotifications } from '../../lib/notifications'
import { C } from '../../constants/theme'
import type { BloodGroup } from '../../types'

type Page = 1 | 2 | 3
const RELATIONS = ['Self', 'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Sibling', 'Grandparent', 'Other']
const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const INPUT_STYLE = {
  backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
  borderColor: C.border, paddingHorizontal: 16, height: 52,
  color: C.text, fontSize: 15,
}

export default function RegisterScreen() {
  const router = useRouter()
  const [page, setPage] = useState<Page>(1)
  const [loading, setLoading] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [relation, setRelation] = useState('Self')
  const [dob, setDob] = useState('')
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null)
  const [phone, setPhone] = useState('')
  const [allergyInput, setAllergyInput] = useState('')
  const [allergies, setAllergies] = useState<string[]>([])

  const goNext = () => {
    if (page === 1) {
      if (!familyName.trim()) { Alert.alert('Required', 'Enter your family name.'); return }
      if (!memberName.trim()) { Alert.alert('Required', 'Enter your name.'); return }
      setPage(2)
    } else if (page === 2) {
      setPage(3)
    }
  }

  const handleDobChange = (text: string) => {
    const d = text.replace(/\D/g, '').slice(0, 8)
    let f = d
    if (d.length > 2) f = `${d.slice(0, 2)}/${d.slice(2)}`
    if (d.length > 4) f = `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
    setDob(f)
  }

  const parseDob = (raw: string) => {
    const p = raw.split('/')
    if (p.length !== 3 || p[2].length !== 4) return null
    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`
  }

  const addAllergy = () => {
    const t = allergyInput.trim()
    if (t && !allergies.includes(t)) setAllergies([...allergies, t])
    setAllergyInput('')
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const pushToken = await registerForPushNotifications().catch(() => null)
      const { data: { user } } = await supabase.auth.getUser()
      await registerFamilyAndFirstMember({
        familyName: familyName.trim(),
        memberName: memberName.trim(),
        relation, dateOfBirth: parseDob(dob),
        bloodGroup, knownAllergies: allergies,
        phone: (user?.phone ?? phone).replace('+91', ''),
        pushToken,
      })
      router.replace('/(app)/')
    } catch (err: unknown) {
      Alert.alert('Setup failed', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const Label = ({ text }: { text: string }) => (
    <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 8 }}>
      {text}
    </Text>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.3 }}>
            Set up your family
          </Text>
          <Text style={{ color: C.textSub, marginTop: 4, marginBottom: 28, fontSize: 14 }}>
            Takes 2 minutes. You can edit everything later.
          </Text>

          {/* Progress bar */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 32 }}>
            {[1, 2, 3].map((p) => (
              <View key={p} style={{
                flex: 1, height: 3, borderRadius: 4,
                backgroundColor: p <= page ? C.accent : C.border,
              }} />
            ))}
          </View>

          {/* ── Page 1 ── */}
          {page === 1 && (
            <View>
              <Label text="Family name" />
              <TextInput
                style={INPUT_STYLE}
                placeholder="e.g. The Sharma Family"
                placeholderTextColor={C.textMute}
                value={familyName}
                onChangeText={setFamilyName}
              />
              <Text style={{ fontSize: 12, color: C.textMute, marginTop: 4 }}>
                A private label — visible only to you
              </Text>

              <Label text="Your full name" />
              <TextInput
                style={INPUT_STYLE}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={C.textMute}
                value={memberName}
                onChangeText={setMemberName}
              />

              <Label text="Your relation" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                  {RELATIONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRelation(r)}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: relation === r ? C.accent : C.surface,
                        borderWidth: 1, borderColor: relation === r ? C.accent : C.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: relation === r ? C.bg : C.textSub }}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* ── Page 2 ── */}
          {page === 2 && (
            <View>
              <Label text="Date of birth (optional)" />
              <TextInput
                style={INPUT_STYLE}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={C.textMute}
                keyboardType="number-pad"
                maxLength={10}
                value={dob}
                onChangeText={handleDobChange}
              />

              <Label text="Blood group (optional)" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {BLOOD_GROUPS.map((bg) => (
                  <TouchableOpacity
                    key={bg}
                    onPress={() => setBloodGroup(bloodGroup === bg ? null : bg)}
                    style={{
                      width: 64, height: 44, borderRadius: 10, borderWidth: 1,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: bloodGroup === bg ? C.danger : C.surface,
                      borderColor: bloodGroup === bg ? C.danger : C.border,
                    }}
                  >
                    <Text style={{ fontWeight: '700', fontSize: 13, color: bloodGroup === bg ? '#fff' : C.textSub }}>
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, color: C.textMute, marginTop: 6 }}>
                Shown prominently on your emergency card
              </Text>

              <Label text="Phone number (optional)" />
              <View style={{
                ...INPUT_STYLE as any, flexDirection: 'row', alignItems: 'center', height: 52,
              }}>
                <Text style={{ color: C.textSub, fontSize: 14, marginRight: 8 }}>+91</Text>
                <View style={{ width: 1, height: 18, backgroundColor: C.border, marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, color: C.text, fontSize: 15 }}
                  placeholder="Used for emergency lookup"
                  placeholderTextColor={C.textMute}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                />
              </View>
            </View>
          )}

          {/* ── Page 3 ── */}
          {page === 3 && (
            <View>
              <Label text="Known allergies (optional)" />
              <Text style={{ color: C.textSub, fontSize: 13, marginBottom: 14, lineHeight: 20 }}>
                Shown in red on your emergency card so doctors see them instantly.
              </Text>

              {allergies.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {allergies.map((a) => (
                    <TouchableOpacity
                      key={a}
                      onPress={() => setAllergies(allergies.filter((x) => x !== a))}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.danger,
                        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: C.danger, fontSize: 13, fontWeight: '600' }}>{a}</Text>
                      <Text style={{ color: C.danger, fontSize: 11 }}>✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={{ ...INPUT_STYLE as any, flex: 1, height: 48 }}
                  placeholder="e.g. Penicillin, Peanuts"
                  placeholderTextColor={C.textMute}
                  value={allergyInput}
                  onChangeText={setAllergyInput}
                  onSubmitEditing={addAllergy}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  onPress={addAllergy}
                  style={{
                    width: 48, height: 48, backgroundColor: C.surface,
                    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: C.border,
                  }}
                >
                  <Text style={{ color: C.accent, fontSize: 22, fontWeight: '300' }}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Summary */}
              <View style={{
                marginTop: 28, backgroundColor: C.surface, borderRadius: 16,
                padding: 18, borderWidth: 1, borderColor: C.border,
              }}>
                <Text style={{ fontWeight: '700', color: C.text, marginBottom: 12, fontSize: 15 }}>
                  Ready to go 🎉
                </Text>
                {[
                  ['Family', familyName],
                  ['Name', `${memberName} (${relation})`],
                  bloodGroup ? ['Blood', bloodGroup] : null,
                  allergies.length ? ['Allergies', allergies.join(', ')] : null,
                ].filter(Boolean).map(([k, v]) => (
                  <Text key={k} style={{ color: C.textSub, fontSize: 13, marginBottom: 4 }}>
                    <Text style={{ fontWeight: '600', color: C.text }}>{k}: </Text>{v}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Navigation buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
            {page > 1 && (
              <TouchableOpacity
                onPress={() => setPage((page - 1) as Page)}
                style={{
                  flex: 1, height: 52, borderRadius: 14, borderWidth: 1,
                  borderColor: C.border, alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ color: C.textSub, fontWeight: '600' }}>Back</Text>
              </TouchableOpacity>
            )}
            {page < 3 ? (
              <TouchableOpacity
                onPress={goNext}
                style={{
                  flex: 1, height: 52, borderRadius: 14,
                  backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ color: C.bg, fontWeight: '700', fontSize: 15 }}>Continue</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1, height: 52, borderRadius: 14,
                  backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
                }}
              >
                {loading
                  ? <ActivityIndicator color={C.bg} />
                  : <Text style={{ color: C.bg, fontWeight: '700', fontSize: 15 }}>Create my family</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
