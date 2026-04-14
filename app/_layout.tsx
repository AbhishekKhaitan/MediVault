import '../global.css'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { userHasFamily } from '../lib/api'
import type { Session } from '@supabase/supabase-js'

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()

  // Prevent the guard from firing before the router is mounted
  const isMounted = useRef(false)
  useEffect(() => { isMounted.current = true }, [])

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  // Runs on every auth state change:
  //   • App launch      → checks stored session in AsyncStorage
  //   • OTP verified    → session created
  //   • Sign out        → session destroyed
  //   • Token refreshed → session updated (no redirect needed)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted.current) return
        await handleAuthChange(session)
      }
    )

    // Also check the existing session immediately on mount
    // (covers the case where the app is reopened with a stored session)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted.current) handleAuthChange(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthChange = async (session: Session | null) => {
    const currentGroup = segments[0] as string | undefined

    if (!session) {
      // No session → send to login (unless already there)
      if (currentGroup !== '(auth)') {
        router.replace('/(auth)/login')
      }
      return
    }

    // Has a valid session — check if they've set up their family yet
    const hasFamily = await userHasFamily()

    if (!hasFamily) {
      // Brand new user — force them through the family setup screen
      if (currentGroup !== '(auth)') {
        router.replace('/(auth)/register')
      }
    } else {
      // Returning user — send to the main app (unless already there)
      if (currentGroup !== '(app)') {
        router.replace('/(app)/')
      }
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen
        name="emergency-access/[phone]"
        options={{ animation: 'none' }}
      />
    </Stack>
  )
}
