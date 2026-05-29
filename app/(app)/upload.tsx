import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native'
import { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { supabase } from '../../lib/supabase'
import { createDocument, getFamilyDocumentCount } from '../../lib/api'
import { useFamilyStore } from '../../stores/familyStore'
import { useDocumentStore } from '../../stores/documentStore'
import { C } from '../../constants/theme'
import type { DocumentType } from '../../types'

type UploadStep = 'pick' | 'preview' | 'uploading' | 'done'

const DOC_TYPES: { value: DocumentType; label: string; icon: string }[] = [
  { value: 'lab_report',        label: 'Lab Report',   icon: '🧪' },
  { value: 'prescription',      label: 'Prescription', icon: '💊' },
  { value: 'discharge_summary', label: 'Discharge',    icon: '🏥' },
  { value: 'xray',              label: 'X-Ray / Scan', icon: '🩻' },
  { value: 'other',             label: 'Other',        icon: '📄' },
]

export default function UploadScreen() {
  const router = useRouter()
  const { family, members, myProfile } = useFamilyStore()
  const { addDocument } = useDocumentStore()

  const [step, setStep] = useState<UploadStep>('pick')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState(myProfile)
  const [docType, setDocType] = useState<DocumentType>('lab_report')
  const [uploadProgress, setUploadProgress] = useState('')
  const [docCount, setDocCount] = useState<number | null>(null)

  const isPro = family?.subscription_status === 'active'

  useEffect(() => {
    if (family && !isPro) getFamilyDocumentCount(family.id).then(setDocCount).catch(() => {})
  }, [family?.id])

  const checkLimit = () => {
    if (isPro) return true
    if (docCount !== null && docCount >= 20) { router.push('/(app)/paywall'); return false }
    return true
  }

  const pickFromCamera = async () => {
    if (!checkLimit()) return
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 })
    if (!result.canceled) { setImageUri(result.assets[0].uri); setStep('preview') }
  }

  const pickFromGallery = async () => {
    if (!checkLimit()) return
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission needed', 'Gallery access is required.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 })
    if (!result.canceled) { setImageUri(result.assets[0].uri); setStep('preview') }
  }

  const handleUpload = async () => {
    if (!imageUri || !selectedMember || !family) return
    setStep('uploading')
    try {
      setUploadProgress('Compressing image…')
      const compressed = await ImageManipulator.manipulateAsync(
        imageUri, [{ resize: { width: 1200 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      )
      setUploadProgress('Uploading…')
      const uuid = Math.random().toString(36).slice(2) + Date.now().toString(36)
      const storagePath = `${family.id}/${selectedMember.id}/${uuid}.jpg`
      const response = await fetch(compressed.uri)
      const blob = await response.blob()
      const { error: storageError } = await supabase.storage.from('documents').upload(storagePath, blob, { contentType: 'image/jpeg', upsert: false })
      if (storageError) throw storageError
      setUploadProgress('Reading your document…')
      const doc = await createDocument({
        family_id: family.id, member_id: selectedMember.id,
        document_type: docType, title: null, doctor_name: null,
        hospital_name: null, document_date: null,
        storage_path: storagePath, parsing_status: 'pending',
      })
      addDocument(doc)
      setUploadProgress('Sending to AI…')
      supabase.functions.invoke('parse-report', { body: { documentId: doc.id } }).catch(() => {})
      setStep('done')
    } catch (err: unknown) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.')
      setStep('preview')
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <TouchableOpacity
          onPress={() => step === 'preview' ? setStep('pick') : router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
        >
          <Ionicons name="arrow-back" size={18} color={C.textSub} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>
          {step === 'pick' ? 'Upload Document' : step === 'preview' ? 'Confirm Upload' : step === 'uploading' ? 'Uploading…' : 'Upload Complete'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        {step === 'pick' && (
          <View>
            <Text style={{ color: C.textSub, fontSize: 14, marginBottom: 28, lineHeight: 22 }}>
              Scan a lab report, prescription, or medical document. Our AI reads it and gives you a plain-English summary.
            </Text>

            <TouchableOpacity onPress={pickFromCamera} activeOpacity={0.8} style={{
              backgroundColor: C.accentBg, borderRadius: 20, padding: 24, alignItems: 'center',
              marginBottom: 12, borderWidth: 1, borderColor: C.accent + '50',
            }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="camera" size={28} color={C.bg} />
              </View>
              <Text style={{ color: C.accent, fontWeight: '700', fontSize: 16 }}>Take a Photo</Text>
              <Text style={{ color: C.textSub, fontSize: 13, marginTop: 4, textAlign: 'center' }}>Best for physical reports</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={pickFromGallery} activeOpacity={0.8} style={{
              backgroundColor: C.surface, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.border,
            }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="images" size={28} color={C.textSub} />
              </View>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>Choose from Gallery</Text>
              <Text style={{ color: C.textSub, fontSize: 13, marginTop: 4 }}>Select a saved photo</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 20, backgroundColor: C.warningBg, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: C.warning + '30' }}>
              <Ionicons name="bulb-outline" size={16} color={C.warning} />
              <Text style={{ flex: 1, color: C.warning, fontSize: 13, lineHeight: 20 }}>
                Ensure the document is flat, well-lit, and all text is visible for best results.
              </Text>
            </View>
          </View>
        )}

        {step === 'preview' && imageUri && (
          <View>
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: 200, borderRadius: 16, marginBottom: 24, backgroundColor: C.surface }} resizeMode="cover" />

            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>For which member?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {members.map((m) => {
                  const sel = selectedMember?.id === m.id
                  return (
                    <TouchableOpacity key={m.id} onPress={() => setSelectedMember(m)} style={{
                      paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1,
                      backgroundColor: sel ? C.accent : C.surface, borderColor: sel ? C.accent : C.border,
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                    }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? C.bg : C.text }}>{m.name.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>

            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Document type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {DOC_TYPES.map((t) => {
                const sel = docType === t.value
                return (
                  <TouchableOpacity key={t.value} onPress={() => setDocType(t.value)} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1,
                    backgroundColor: sel ? C.accent : C.surface, borderColor: sel ? C.accent : C.border,
                  }}>
                    <Text>{t.icon}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? C.bg : C.text }}>{t.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity onPress={handleUpload} disabled={!selectedMember} style={{
              height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
              backgroundColor: selectedMember ? C.accent : C.surface,
            }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: selectedMember ? C.bg : C.textMute }}>
                Upload & Analyse
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'uploading' && (
          <View style={{ alignItems: 'center', paddingVertical: 64 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <ActivityIndicator size="large" color={C.accent} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 }}>{uploadProgress}</Text>
            <Text style={{ color: C.textSub, textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
              Our AI is reading your document.{'\n'}This takes about 10–15 seconds.
            </Text>
          </View>
        )}

        {step === 'done' && (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Ionicons name="checkmark-circle" size={52} color={C.success} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 }}>Uploaded!</Text>
            <Text style={{ color: C.textSub, textAlign: 'center', fontSize: 14, lineHeight: 22, marginBottom: 32 }}>
              We're analysing it now. You'll get a notification when the summary is ready.
            </Text>
            <TouchableOpacity onPress={() => { setStep('pick'); setImageUri(null); router.push(selectedMember ? `/(app)/member/${selectedMember.id}` : '/(app)/') }}
              style={{ width: '100%', height: 52, backgroundColor: C.accent, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Text style={{ color: C.bg, fontWeight: '700', fontSize: 15 }}>View Report</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('pick'); setImageUri(null) }}
              style={{ width: '100%', height: 52, backgroundColor: C.surface, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.text, fontWeight: '600', fontSize: 15 }}>Upload Another</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
