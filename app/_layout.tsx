import '../global.css'
import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter, useSegments } from 'expo-router'

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const inAuthGroup = segments[0] === '(auth)'
        const inAppGroup = segments[0] === '(app)'

        if (session && inAuthGroup) {
          router.replace('/(app)/')
        } else if (!session && inAppGroup) {
          router.replace('/(auth)/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="emergency-access/[phone]" />
    </Stack>
  )
}
