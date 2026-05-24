import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
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
import type { DocumentType, FamilyMember } from '../../types'

// ─── Upload step state machine ────────────────────────────────────────────────
type UploadStep =
  | 'pick'          // initial — pick image source
  | 'preview'       // image selected — choose member + type, confirm
  | 'uploading'     // compressing + uploading to storage
  | 'done'          // success screen

const DOC_TYPES: { value: DocumentType; label: string; icon: string }[] = [
  { value: 'lab_report',        label: 'Lab Report',        icon: '🧪' },
  { value: 'prescription',      label: 'Prescription',      icon: '💊' },
  { value: 'discharge_summary', label: 'Discharge Summary', icon: '🏥' },
  { value: 'xray',              label: 'X-Ray / Scan',      icon: '🩻' },
  { value: 'other',             label: 'Other',             icon: '📄' },
]

export default function UploadScreen() {
  const router = useRouter()
  const { family, members, myProfile } = useFamilyStore()
  const { addDocument } = useDocumentStore()

  const [step, setStep] = useState<UploadStep>('pick')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(myProfile)
  const [docType, setDocType] = useState<DocumentType>('lab_report')
  const [uploadProgress, setUploadProgress] = useState('')
  const [docCount, setDocCount] = useState<number | null>(null)

  const isPro = family?.subscription_status === 'active'

  // Check document count on mount for free-tier gate
  useEffect(() => {
    if (family && !isPro) {
      getFamilyDocumentCount(family.id).then(setDocCount).catch(() => {})
    }
  }, [family?.id])

  const checkFreeTierLimit = (): boolean => {
    if (isPro) return true
    if (docCount !== null && docCount >= 20) {
      router.push('/(app)/paywall')
      return false
    }
    return true
  }

  // ─── Pick from camera ──────────────────────────────────────────────────────
  const pickFromCamera = async () => {
    if (!checkFreeTierLimit()) return
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to scan documents.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    })
    if (!result.canceled) {
      setImageUri(result.assets[0].uri)
      setStep('preview')
    }
  }

  // ─── Pick from gallery ─────────────────────────────────────────────────────
  const pickFromGallery = async () => {
    if (!checkFreeTierLimit()) return
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to upload documents.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    })
    if (!result.canceled) {
      setImageUri(result.assets[0].uri)
      setStep('preview')
    }
  }

  // ─── Compress + Upload ─────────────────────────────────────────────────────
  // Enforces max 1200px and JPEG 0.82 quality as per CLAUDE.md constraints
  const handleUpload = async () => {
    if (!imageUri || !selectedMember || !family) return

    setStep('uploading')

    try {
      // Step 1 — Compress image
      setUploadProgress('Compressing image...')
      const compressed = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1200 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      )

      // Step 2 — Generate a unique file path in storage
      setUploadProgress('Uploading document...')
      const uuid = Math.random().toString(36).slice(2) + Date.now().toString(36)
      const storagePath = `${family.id}/${selectedMember.id}/${uuid}.jpg`

      // Step 3 — Read compressed image as base64 and upload
      const response = await fetch(compressed.uri)
      const blob = await response.blob()

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (storageError) throw storageError

      // Step 4 — Create the document row (triggers parse-report edge function)
      setUploadProgress('Reading your document...')
      const doc = await createDocument({
        family_id: family.id,
        member_id: selectedMember.id,
        document_type: docType,
        title: null,
        doctor_name: null,
        hospital_name: null,
        document_date: null,
        storage_path: storagePath,
        parsing_status: 'pending',
      })

      // Step 5 — Add to local store so UI updates immediately
      addDocument(doc)

      // Step 6 — Trigger the parse-report edge function
      setUploadProgress('Sending to AI for analysis...')
      supabase.functions.invoke('parse-report', {
        body: { documentId: doc.id },
      }).catch(() => {
        // Edge function errors are non-blocking — parsing status will show 'failed'
      })

      setStep('done')
    } catch (err: unknown) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Please try again.')
      setStep('preview')
    }
  }

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>

      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-3 border-b border-slate-100">
        <TouchableOpacity
          onPress={() => step === 'preview' ? setStep('pick') : router.back()}
          className="w-9 h-9 items-center justify-center rounded-full bg-slate-100 mr-3"
        >
          <Ionicons name="arrow-back" size={18} color="#475569" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">
          {step === 'pick' ? 'Upload Document'
            : step === 'preview' ? 'Confirm Upload'
            : step === 'uploading' ? 'Uploading...'
            : 'Upload Complete'}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">

        {/* ── Step: Pick ── */}
        {step === 'pick' && (
          <View>
            <Text className="text-slate-500 mb-8 text-base">
              Scan a lab report, prescription, or any medical document. Our AI will read it and give you a plain-English summary.
            </Text>

            {/* Camera option */}
            <TouchableOpacity
              onPress={pickFromCamera}
              className="bg-sky-50 border-2 border-sky-200 rounded-3xl p-6 items-center mb-4"
            >
              <View className="w-16 h-16 bg-sky-500 rounded-full items-center justify-center mb-3">
                <Ionicons name="camera" size={32} color="#fff" />
              </View>
              <Text className="text-sky-700 font-bold text-lg">Take a Photo</Text>
              <Text className="text-sky-500 text-sm mt-1 text-center">
                Best for physical reports — point your camera at the page
              </Text>
            </TouchableOpacity>

            {/* Gallery option */}
            <TouchableOpacity
              onPress={pickFromGallery}
              className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 items-center"
            >
              <View className="w-16 h-16 bg-slate-400 rounded-full items-center justify-center mb-3">
                <Ionicons name="images" size={32} color="#fff" />
              </View>
              <Text className="text-slate-700 font-bold text-lg">Choose from Gallery</Text>
              <Text className="text-slate-400 text-sm mt-1 text-center">
                Select a photo you already have saved
              </Text>
            </TouchableOpacity>

            {/* Tip */}
            <View className="mt-6 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex-row gap-3">
              <Ionicons name="bulb-outline" size={18} color="#D97706" />
              <Text className="flex-1 text-amber-700 text-sm">
                For best results, ensure the document is flat, well-lit, and all text is visible.
              </Text>
            </View>
          </View>
        )}

        {/* ── Step: Preview ── */}
        {step === 'preview' && imageUri && (
          <View>
            {/* Image preview */}
            <Image
              source={{ uri: imageUri }}
              className="w-full h-56 rounded-2xl mb-6 bg-slate-100"
              resizeMode="cover"
            />

            {/* For which member? */}
            <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              For which family member?
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
              <View className="flex-row gap-2">
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setSelectedMember(m)}
                    className={`px-4 py-2.5 rounded-full border flex-row items-center gap-2 ${
                      selectedMember?.id === m.id
                        ? 'bg-sky-500 border-sky-500'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    <View className={`w-5 h-5 rounded-full items-center justify-center ${
                      selectedMember?.id === m.id ? 'bg-sky-400' : 'bg-slate-200'
                    }`}>
                      <Text className="text-xs font-bold" style={{ color: selectedMember?.id === m.id ? '#fff' : '#64748B' }}>
                        {m.name.charAt(0)}
                      </Text>
                    </View>
                    <Text className={`text-sm font-medium ${selectedMember?.id === m.id ? 'text-white' : 'text-slate-700'}`}>
                      {m.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Document type */}
            <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Document type
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-8">
              {DOC_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setDocType(t.value)}
                  className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full border ${
                    docType === t.value
                      ? 'bg-sky-500 border-sky-500'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  <Text>{t.icon}</Text>
                  <Text className={`text-sm font-medium ${docType === t.value ? 'text-white' : 'text-slate-700'}`}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Upload button */}
            <TouchableOpacity
              onPress={handleUpload}
              disabled={!selectedMember}
              className={`h-14 rounded-2xl items-center justify-center ${selectedMember ? 'bg-sky-500' : 'bg-slate-200'}`}
            >
              <Text className={`font-semibold text-base ${selectedMember ? 'text-white' : 'text-slate-400'}`}>
                Upload & Analyse
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step: Uploading ── */}
        {step === 'uploading' && (
          <View className="flex-1 items-center justify-center py-20">
            <View className="w-20 h-20 bg-sky-50 rounded-full items-center justify-center mb-6">
              <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
            <Text className="text-xl font-bold text-slate-900 mb-2">{uploadProgress}</Text>
            <Text className="text-slate-500 text-center text-sm">
              Our AI is reading the document.{'\n'}This takes about 10–15 seconds.
            </Text>
          </View>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && (
          <View className="flex-1 items-center justify-center py-16">
            <View className="w-24 h-24 bg-green-50 rounded-full items-center justify-center mb-6">
              <Ionicons name="checkmark-circle" size={56} color="#22C55E" />
            </View>
            <Text className="text-2xl font-bold text-slate-900 mb-2 text-center">Document uploaded!</Text>
            <Text className="text-slate-500 text-center text-base mb-8">
              We're analysing it now. You'll get a notification when the summary is ready.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setStep('pick')
                setImageUri(null)
                router.push(selectedMember ? `/(app)/member/${selectedMember.id}` : '/(app)/')
              }}
              className="h-14 w-full bg-sky-500 rounded-2xl items-center justify-center mb-3"
            >
              <Text className="text-white font-semibold text-base">View Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setStep('pick'); setImageUri(null) }}
              className="h-14 w-full bg-slate-100 rounded-2xl items-center justify-center"
            >
              <Text className="text-slate-700 font-semibold">Upload Another</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}
