import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { createFamilyMember } from '../lib/api'
import type { BloodGroup } from '../types'

const RELATIONS = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Sibling', 'Grandparent', 'Other']
const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

interface Props {
  visible: boolean
  familyId: string
  onClose: () => void
  onAdded: () => void
}

export function AddMemberSheet({ visible, familyId, onClose, onAdded }: Props) {
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('Father')
  const [dob, setDob] = useState('')
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null)
  const [phone, setPhone] = useState('')
  const [allergyInput, setAllergyInput] = useState('')
  const [allergies, setAllergies] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setName(''); setRelation('Father'); setDob(''); setBloodGroup(null)
    setPhone(''); setAllergyInput(''); setAllergies([])
  }

  const handleClose = () => { reset(); onClose() }

  // DD/MM/YYYY → YYYY-MM-DD
  const handleDobChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8)
    let f = digits
    if (digits.length > 2) f = `${digits.slice(0, 2)}/${digits.slice(2)}`
    if (digits.length > 4) f = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
    setDob(f)
  }

  const parseDob = (raw: string): string | null => {
    const p = raw.split('/')
    if (p.length !== 3 || p[2].length !== 4) return null
    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`
  }

  const addAllergy = () => {
    const t = allergyInput.trim()
    if (t && !allergies.includes(t)) setAllergies([...allergies, t])
    setAllergyInput('')
  }

  const handleAdd = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter the member\'s name.'); return }

    setLoading(true)
    try {
      await createFamilyMember({
        family_id: familyId,
        user_id: null,          // They don't have the app yet — can be linked later
        name: name.trim(),
        relation,
        date_of_birth: parseDob(dob),
        blood_group: bloodGroup,
        known_allergies: allergies,
        phone: phone || null,
        is_admin: false,
        emergency_access_enabled: true,
        avatar_url: null,
      })
      reset()
      onAdded()
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not add member.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Sheet header ── */}
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <Text className="text-xl font-bold text-slate-900">Add Family Member</Text>
          <TouchableOpacity onPress={handleClose} className="w-8 h-8 items-center justify-center">
            <Ionicons name="close" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 20, paddingBottom: 40 }}
        >
          {/* Name */}
          <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Full Name *</Text>
          <TextInput
            className="border border-slate-300 rounded-2xl px-4 h-12 text-slate-900 mb-5"
            placeholder="e.g. Priya Sharma"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
          />

          {/* Relation */}
          <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Relation *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            <View className="flex-row gap-2">
              {RELATIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRelation(r)}
                  className={`px-4 py-2 rounded-full border ${
                    relation === r ? 'bg-sky-500 border-sky-500' : 'bg-white border-slate-300'
                  }`}
                >
                  <Text className={`text-sm font-medium ${relation === r ? 'text-white' : 'text-slate-700'}`}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Date of birth */}
          <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Date of Birth</Text>
          <TextInput
            className="border border-slate-300 rounded-2xl px-4 h-12 text-slate-900 mb-5"
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            maxLength={10}
            value={dob}
            onChangeText={handleDobChange}
          />

          {/* Blood group */}
          <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Blood Group</Text>
          <View className="flex-row flex-wrap gap-2 mb-5">
            {BLOOD_GROUPS.map((bg) => (
              <TouchableOpacity
                key={bg}
                onPress={() => setBloodGroup(bloodGroup === bg ? null : bg)}
                className={`w-14 h-10 rounded-xl border items-center justify-center ${
                  bloodGroup === bg ? 'bg-red-500 border-red-500' : 'bg-white border-slate-300'
                }`}
              >
                <Text className={`font-bold text-sm ${bloodGroup === bg ? 'text-white' : 'text-slate-700'}`}>
                  {bg}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Phone */}
          <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Phone</Text>
          <View className="flex-row items-center border border-slate-300 rounded-2xl px-4 h-12 mb-5">
            <Text className="text-slate-500 mr-2">+91</Text>
            <View className="w-px h-5 bg-slate-200 mr-2" />
            <TextInput
              className="flex-1 text-slate-900"
              placeholder="For emergency lookup"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
            />
          </View>

          {/* Allergies */}
          <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Known Allergies</Text>
          {allergies.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-3">
              {allergies.map((a) => (
                <TouchableOpacity
                  key={a}
                  onPress={() => setAllergies(allergies.filter((x) => x !== a))}
                  className="flex-row items-center bg-red-50 border border-red-200 rounded-full px-3 py-1 gap-1"
                >
                  <Text className="text-red-600 text-sm">{a}</Text>
                  <Ionicons name="close-circle" size={14} color="#F87171" />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View className="flex-row gap-2 mb-6">
            <TextInput
              className="flex-1 border border-slate-300 rounded-2xl px-4 h-12 text-slate-900"
              placeholder="e.g. Penicillin"
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
              <Ionicons name="add" size={22} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleAdd}
            disabled={loading}
            className="h-14 bg-sky-500 rounded-2xl items-center justify-center"
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-semibold text-base">Add to Family</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}
