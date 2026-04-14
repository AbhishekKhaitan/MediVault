import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { registerFamilyAndFirstMember } from '../../lib/api'
import { registerForPushNotifications } from '../../lib/notifications'
import type { BloodGroup } from '../../types'

// ─── Multi-step form: 3 pages ─────────────────────────────────────────────────
// Page 1: Family name + user's name + relation
// Page 2: Date of birth + blood group + phone number
// Page 3: Known allergies (optional) + final confirmation
type Page = 1 | 2 | 3

const RELATIONS = ['Self', 'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Sibling', 'Grandparent', 'Other']
const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function RegisterScreen() {
  const router = useRouter()

  // ─── Form state ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState<Page>(1)
  const [loading, setLoading] = useState(false)

  // Page 1
  const [familyName, setFamilyName] = useState('')
  const [memberName, setMemberName] = useState('')
  const [relation, setRelation] = useState<string>('Self')

  // Page 2
  const [dob, setDob] = useState('')                        // 'DD/MM/YYYY'
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null)
  const [phone, setPhone] = useState('')

  // Page 3
  const [allergyInput, setAllergyInput] = useState('')
  const [allergies, setAllergies] = useState<string[]>([])

  // ─── Navigation between pages ────────────────────────────────────────────────
  const goNext = () => {
    if (page === 1) {
      if (!familyName.trim()) { Alert.alert('Required', 'Please enter your family name.'); return }
      if (!memberName.trim()) { Alert.alert('Required', 'Please enter your name.'); return }
      setPage(2)
    } else if (page === 2) {
      setPage(3)
    }
  }

  const goBack = () => {
    if (page > 1) setPage((page - 1) as Page)
  }

  // ─── Date of birth formatting: auto-inserts slashes ─────────────────────────
  const handleDobChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
    setDob(formatted)
  }

  // Parse DD/MM/YYYY → YYYY-MM-DD for Supabase
  const parseDob = (raw: string): string | null => {
    const parts = raw.split('/')
    if (parts.length !== 3 || parts[2].length !== 4) return null
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  }

  // ─── Allergy chip management ─────────────────────────────────────────────────
  const addAllergy = () => {
    const trimmed = allergyInput.trim()
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed])
    }
    setAllergyInput('')
  }

  const removeAllergy = (item: string) => {
    setAllergies(allergies.filter((a) => a !== item))
  }

  // ─── Final submission ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Get push token — best effort, don't block registration if denied
      const pushToken = await registerForPushNotifications().catch(() => null)

      // Get the user's phone from their auth session
      const { data: { user } } = await supabase.auth.getUser()
      const authPhone = user?.phone ?? phone

      await registerFamilyAndFirstMember({
        familyName: familyName.trim(),
        memberName: memberName.trim(),
        relation,
        dateOfBirth: parseDob(dob),
        bloodGroup,
        knownAllergies: allergies,
        phone: authPhone.replace('+91', ''),
        pushToken,
      })

      router.replace('/(app)/')
    } catch (err: unknown) {
      Alert.alert('Setup failed', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Shared components ────────────────────────────────────────────────────────
  const SectionLabel = ({ text }: { text: string }) => (
    <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 mt-5">{text}</Text>
  )

  const StyledInput = ({
    value, onChangeText, placeholder, keyboardType = 'default', maxLength,
  }: {
    value: string
    onChangeText: (t: string) => void
    placeholder: string
    keyboardType?: 'default' | 'phone-pad' | 'number-pad'
    maxLength?: number
  }) => (
    <TextInput
      className="border border-slate-300 rounded-2xl px-4 h-14 text-slate-900 text-base"
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      maxLength={maxLength}
    />
  )

  // ─── Progress bar ─────────────────────────────────────────────────────────────
  const ProgressBar = () => (
    <View className="flex-row gap-2 mb-8">
      {([1, 2, 3] as Page[]).map((p) => (
        <View
          key={p}
          className={`flex-1 h-1 rounded-full ${p <= page ? 'bg-sky-500' : 'bg-slate-200'}`}
        />
      ))}
    </View>
  )

  // ─── UI ───────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text className="text-3xl font-bold text-slate-900 mb-1">Set up your family</Text>
        <Text className="text-slate-500 mb-6">This takes 2 minutes. You can edit everything later.</Text>

        <ProgressBar />

        {/* ── Page 1: Names ── */}
        {page === 1 && (
          <View>
            <SectionLabel text="Your family name" />
            <StyledInput
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="e.g. The Sharma Family"
            />
            <Text className="text-xs text-slate-400 mt-1 ml-1">This is just a label — visible only to you.</Text>

            <SectionLabel text="Your full name" />
            <StyledInput
              value={memberName}
              onChangeText={setMemberName}
              placeholder="e.g. Rahul Sharma"
            />

            <SectionLabel text="Your relation in the family" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              <View className="flex-row gap-2 py-1">
                {RELATIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRelation(r)}
                    className={`px-4 py-2 rounded-full border ${
                      relation === r
                        ? 'bg-sky-500 border-sky-500'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${relation === r ? 'text-white' : 'text-slate-700'}`}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Page 2: Health basics ── */}
        {page === 2 && (
          <View>
            <SectionLabel text="Date of birth (optional)" />
            <StyledInput
              value={dob}
              onChangeText={handleDobChange}
              placeholder="DD/MM/YYYY"
              keyboardType="number-pad"
              maxLength={10}
            />
            <Text className="text-xs text-slate-400 mt-1 ml-1">
              Used to calculate age on reports. Not stored publicly.
            </Text>

            <SectionLabel text="Blood group (optional)" />
            <View className="flex-row flex-wrap gap-2">
              {BLOOD_GROUPS.map((bg) => (
                <TouchableOpacity
                  key={bg}
                  onPress={() => setBloodGroup(bloodGroup === bg ? null : bg)}
                  className={`w-16 h-12 rounded-xl border items-center justify-center ${
                    bloodGroup === bg
                      ? 'bg-red-500 border-red-500'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <Text className={`font-bold text-sm ${bloodGroup === bg ? 'text-white' : 'text-slate-700'}`}>
                    {bg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-xs text-slate-400 mt-2 ml-1">
              Shown prominently on your emergency card.
            </Text>

            <SectionLabel text="Phone number (optional)" />
            <View className="flex-row items-center border border-slate-300 rounded-2xl px-4 h-14">
              <Text className="text-slate-500 text-base mr-2">+91</Text>
              <View className="w-px h-6 bg-slate-200 mr-3" />
              <TextInput
                className="flex-1 text-slate-900 text-base"
                placeholder="Used for emergency lookup"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              />
            </View>
            <Text className="text-xs text-slate-400 mt-1 ml-1">
              Allows receptionists to pull your emergency profile by phone number.
            </Text>
          </View>
        )}

        {/* ── Page 3: Allergies ── */}
        {page === 3 && (
          <View>
            <SectionLabel text="Known allergies (optional)" />
            <Text className="text-slate-500 text-sm mb-4">
              These are shown in red on your emergency card so doctors can see them instantly.
            </Text>

            {/* Allergy chips */}
            {allergies.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {allergies.map((a) => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => removeAllergy(a)}
                    className="flex-row items-center bg-red-50 border border-red-200 rounded-full px-3 py-1 gap-1"
                  >
                    <Text className="text-red-600 text-sm font-medium">{a}</Text>
                    <Text className="text-red-400 text-xs">✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Add allergy input */}
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border border-slate-300 rounded-2xl px-4 h-12 text-slate-900"
                placeholder="e.g. Penicillin, Peanuts, Sulfa"
                placeholderTextColor="#94A3B8"
                value={allergyInput}
                onChangeText={setAllergyInput}
                onSubmitEditing={addAllergy}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={addAllergy}
                className="w-12 h-12 bg-slate-100 rounded-2xl items-center justify-center"
              >
                <Text className="text-slate-700 text-xl font-light">+</Text>
              </TouchableOpacity>
            </View>

            {/* Summary card */}
            <View className="mt-8 bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <Text className="font-bold text-slate-900 mb-3">Ready to go 🎉</Text>
              <View className="gap-1">
                <Text className="text-slate-600 text-sm">
                  <Text className="font-medium">Family: </Text>{familyName}
                </Text>
                <Text className="text-slate-600 text-sm">
                  <Text className="font-medium">Name: </Text>{memberName} ({relation})
                </Text>
                {bloodGroup && (
                  <Text className="text-slate-600 text-sm">
                    <Text className="font-medium">Blood group: </Text>{bloodGroup}
                  </Text>
                )}
                {allergies.length > 0 && (
                  <Text className="text-red-600 text-sm">
                    <Text className="font-medium">Allergies: </Text>{allergies.join(', ')}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── Navigation buttons ── */}
        <View className="flex-row gap-3 mt-8">
          {page > 1 && (
            <TouchableOpacity
              onPress={goBack}
              className="flex-1 h-14 rounded-2xl border border-slate-300 items-center justify-center"
            >
              <Text className="text-slate-700 font-semibold">Back</Text>
            </TouchableOpacity>
          )}

          {page < 3 ? (
            <TouchableOpacity
              onPress={goNext}
              className="flex-1 h-14 rounded-2xl bg-sky-500 items-center justify-center"
            >
              <Text className="text-white font-semibold">Continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="flex-1 h-14 rounded-2xl bg-sky-500 items-center justify-center"
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white font-semibold text-base">Create my family</Text>
              }
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}
