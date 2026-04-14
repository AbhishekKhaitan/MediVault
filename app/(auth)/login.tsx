import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { sendPhoneOtp, verifyPhoneOtp, userHasFamily } from '../../lib/api'

// ─── Two-step state machine ───────────────────────────────────────────────────
// step = 'phone' → user types their number, taps Send OTP
// step = 'otp'   → user types 6-digit code, taps Verify
type Step = 'phone' | 'otp'

export default function LoginScreen() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // ─── Format phone as user types ────────────────────────────────────────────
  // Strips non-digits, enforces max 10 digits (Indian mobile numbers)
  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
  }

  // ─── Step 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert('Invalid number', 'Please enter a 10-digit Indian mobile number.')
      return
    }

    setLoading(true)
    try {
      await sendPhoneOtp(phone)
      setStep('otp')
      startResendCooldown()
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit code you received.')
      return
    }

    setLoading(true)
    try {
      await verifyPhoneOtp(phone, otp)

      // After login, check if this user already has a family set up.
      // New user → register screen.  Returning user → home screen.
      const hasFamily = await userHasFamily()
      if (hasFamily) {
        router.replace('/(app)/')
      } else {
        router.replace('/(auth)/register')
      }
    } catch (err: unknown) {
      Alert.alert('Wrong code', 'The OTP is incorrect or has expired. Try again.')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  // ─── Resend cooldown (30 seconds) ─────────────────────────────────────────
  const startResendCooldown = () => {
    setResendCooldown(30)
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setOtp('')
    setLoading(true)
    try {
      await sendPhoneOtp(phone)
      startResendCooldown()
    } catch {
      Alert.alert('Error', 'Could not resend OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 pt-20 pb-10">

        {/* Logo / Header */}
        <View className="mb-12">
          <Text className="text-4xl font-bold text-sky-500 tracking-tight">MediVault</Text>
          <Text className="text-slate-500 mt-1 text-base">
            Your family's health memory, forever.
          </Text>
        </View>

        {step === 'phone' ? (
          /* ── Phone step ── */
          <View>
            <Text className="text-2xl font-bold text-slate-900 mb-1">Enter your number</Text>
            <Text className="text-slate-500 mb-8">We'll send a one-time code over SMS.</Text>

            {/* Phone input */}
            <View className="flex-row items-center border border-slate-300 rounded-2xl px-4 h-14 mb-6 focus:border-sky-500">
              <Text className="text-slate-500 text-base mr-2">🇮🇳 +91</Text>
              <View className="w-px h-6 bg-slate-200 mr-3" />
              <TextInput
                className="flex-1 text-slate-900 text-base"
                placeholder="98765 43210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={handlePhoneChange}
                autoFocus
              />
            </View>

            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={loading || phone.length !== 10}
              className={`h-14 rounded-2xl items-center justify-center ${
                phone.length === 10 ? 'bg-sky-500' : 'bg-slate-200'
              }`}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className={`font-semibold text-base ${phone.length === 10 ? 'text-white' : 'text-slate-400'}`}>
                    Send OTP
                  </Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          /* ── OTP step ── */
          <View>
            <Text className="text-2xl font-bold text-slate-900 mb-1">Enter the code</Text>
            <Text className="text-slate-500 mb-8">
              Sent to +91 {phone.slice(0, 5)} {phone.slice(5)}
            </Text>

            {/* OTP input */}
            <TextInput
              className="border border-slate-300 rounded-2xl px-4 h-14 text-slate-900 text-2xl tracking-widest text-center mb-6"
              placeholder="• • • • • •"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              autoFocus
            />

            {/* Verify button */}
            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className={`h-14 rounded-2xl items-center justify-center mb-5 ${
                otp.length === 6 ? 'bg-sky-500' : 'bg-slate-200'
              }`}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className={`font-semibold text-base ${otp.length === 6 ? 'text-white' : 'text-slate-400'}`}>
                    Verify
                  </Text>
              }
            </TouchableOpacity>

            {/* Back + Resend row */}
            <View className="flex-row justify-between items-center">
              <TouchableOpacity onPress={() => { setStep('phone'); setOtp('') }}>
                <Text className="text-slate-500 text-sm">← Change number</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
                <Text className={`text-sm font-medium ${resendCooldown > 0 ? 'text-slate-400' : 'text-sky-500'}`}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Footer */}
        <View className="mt-auto">
          <Text className="text-xs text-slate-400 text-center">
            By continuing, you agree to our Terms & Privacy Policy.{'\n'}
            Your medical data is encrypted and private.
          </Text>
        </View>

      </View>
    </KeyboardAvoidingView>
  )
}
