import '../global.css'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'
import { userHasFamily } from '../lib/api'
import { C } from '../constants/theme'
import type { Session } from '@supabase/supabase-js'

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const isMounted = useRef(false)
  // Track whether we've already handled the initial navigation so
  // token-refresh events don't trigger another DB call + redirect
  const hasNavigated = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => { isMounted.current = true }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted.current) return
        // TOKEN_REFRESHED fires on every silent refresh — don't re-route
        if (event === 'TOKEN_REFRESHED') return
        await handleAuthChange(session)
      }
    )

    // Check the stored session once on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted.current) handleAuthChange(session).finally(() => setReady(true))
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthChange = async (session: Session | null) => {
    const currentGroup = segments[0] as string | undefined

    if (!session) {
      hasNavigated.current = false
      if (currentGroup !== '(auth)') router.replace('/(auth)/login')
      return
    }

    // Skip redundant re-routing if we're already in the app
    if (hasNavigated.current && currentGroup === '(app)') return

    const hasFamily = await userHasFamily()
    hasNavigated.current = true

    if (!hasFamily) {
      if (currentGroup !== '(auth)') router.replace('/(auth)/register')
    } else {
      if (currentGroup !== '(app)') router.replace('/(app)/')
    }
  }

  // Dark splash while the initial session check runs
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="emergency-access/[phone]" options={{ animation: 'none' }} />
    </Stack>
  )
}
