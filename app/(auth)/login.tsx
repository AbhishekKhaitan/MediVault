import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { sendPhoneOtp, verifyPhoneOtp, userHasFamily } from '../../lib/api'
import { C } from '../../constants/theme'

type Step = 'phone' | 'otp'

export default function LoginScreen() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const handlePhoneChange = (text: string) => {
    setPhone(text.replace(/\D/g, '').slice(0, 10))
  }

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
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not send OTP.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return
    setLoading(true)
    try {
      await verifyPhoneOtp(phone, otp)
      const hasFamily = await userHasFamily()
      router.replace(hasFamily ? '/(app)/' : '/(auth)/register')
    } catch {
      Alert.alert('Wrong code', 'The OTP is incorrect or has expired.')
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  const startResendCooldown = () => {
    setResendCooldown(30)
    const iv = setInterval(() => {
      setResendCooldown((p) => { if (p <= 1) { clearInterval(iv); return 0 } return p - 1 })
    }, 1000)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setOtp(''); setLoading(true)
    try { await sendPhoneOtp(phone); startResendCooldown() }
    catch { Alert.alert('Error', 'Could not resend OTP.') }
    finally { setLoading(false) }
  }

  const canSubmit = step === 'phone' ? phone.length === 10 : otp.length === 6

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 }}>

          {/* ── Brand ── */}
          <View style={{ marginBottom: 56 }}>
            <View style={{
              width: 52, height: 52, borderRadius: 14,
              backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Ionicons name="shield-checkmark" size={26} color={C.accent} />
            </View>
            <Text style={{ fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -0.5 }}>
              MediVault
            </Text>
            <Text style={{ color: C.textSub, marginTop: 4, fontSize: 15 }}>
              Your family's health memory, secured.
            </Text>
          </View>

          {step === 'phone' ? (
            <View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 4 }}>
                Enter your number
              </Text>
              <Text style={{ color: C.textSub, marginBottom: 28, fontSize: 14 }}>
                We'll send a one-time code via SMS.
              </Text>

              {/* Phone input */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
                borderColor: C.border, paddingHorizontal: 16, height: 56, marginBottom: 20,
              }}>
                <Text style={{ color: C.textSub, fontSize: 15, marginRight: 8 }}>🇮🇳 +91</Text>
                <View style={{ width: 1, height: 20, backgroundColor: C.border, marginRight: 12 }} />
                <TextInput
                  style={{ flex: 1, color: C.text, fontSize: 17, letterSpacing: 1 }}
                  placeholder="98765 43210"
                  placeholderTextColor={C.textMute}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={loading || !canSubmit}
                style={{
                  height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: canSubmit ? C.accent : C.surface,
                  borderWidth: canSubmit ? 0 : 1, borderColor: C.border,
                }}
              >
                {loading
                  ? <ActivityIndicator color={C.bg} />
                  : <Text style={{ fontWeight: '700', fontSize: 16, color: canSubmit ? C.bg : C.textMute }}>
                      Send OTP
                    </Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Back button */}
              <TouchableOpacity
                onPress={() => { setStep('phone'); setOtp('') }}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28, alignSelf: 'flex-start' }}
              >
                <Ionicons name="arrow-back" size={18} color={C.textSub} />
                <Text style={{ color: C.textSub, marginLeft: 6, fontSize: 14 }}>Change number</Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 4 }}>
                Enter the code
              </Text>
              <Text style={{ color: C.textSub, marginBottom: 28, fontSize: 14 }}>
                Sent to +91 {phone.slice(0, 5)} {phone.slice(5)}
              </Text>

              {/* OTP boxes */}
              <TextInput
                style={{
                  backgroundColor: C.surface, borderRadius: 14, borderWidth: 1,
                  borderColor: otp.length > 0 ? C.accent : C.border,
                  paddingHorizontal: 16, height: 64,
                  color: C.text, fontSize: 28, letterSpacing: 12,
                  textAlign: 'center', marginBottom: 20,
                }}
                placeholder="• • • • • •"
                placeholderTextColor={C.textMute}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                autoFocus
              />

              <TouchableOpacity
                onPress={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                style={{
                  height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: otp.length === 6 ? C.accent : C.surface,
                  borderWidth: otp.length === 6 ? 0 : 1, borderColor: C.border,
                  marginBottom: 20,
                }}
              >
                {loading
                  ? <ActivityIndicator color={C.bg} />
                  : <Text style={{ fontWeight: '700', fontSize: 16, color: otp.length === 6 ? C.bg : C.textMute }}>
                      Verify
                    </Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResend}
                disabled={resendCooldown > 0}
                style={{ alignSelf: 'center' }}
              >
                <Text style={{ fontSize: 14, color: resendCooldown > 0 ? C.textMute : C.accent }}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <View style={{ marginTop: 'auto' }}>
            <Text style={{ fontSize: 12, color: C.textMute, textAlign: 'center', lineHeight: 18 }}>
              By continuing, you agree to our Terms & Privacy Policy.{'\n'}
              Your medical data is end-to-end encrypted.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
