import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Family, FamilyMember } from '../types'
import { getMyFamily, getFamilyMembers, getMyMemberProfile } from '../lib/api'
import { registerForPushNotifications } from '../lib/notifications'
import { supabase } from '../lib/supabase'

interface FamilyStore {
  family: Family | null
  members: FamilyMember[]
  myProfile: FamilyMember | null
  isLoading: boolean
  isHydrated: boolean
  error: string | null
  loadFamily: () => Promise<void>
  refreshFamily: () => Promise<void>
  isPro: () => boolean
  reset: () => void
  setHydrated: () => void
}

export const useFamilyStore = create<FamilyStore>()(
  persist(
    (set, get) => ({
      family: null,
      members: [],
      myProfile: null,
      isLoading: false,
      isHydrated: false,
      error: null,

      setHydrated: () => set({ isHydrated: true }),

      loadFamily: async () => {
        // If we already have cached data, don't show the loading spinner —
        // just fetch in the background and update silently
        const hasCached = !!get().family
        if (!hasCached) set({ isLoading: true, error: null })

        try {
          const [family, myProfile] = await Promise.all([
            getMyFamily(),
            getMyMemberProfile(),
          ])
          let members: FamilyMember[] = []
          if (family) members = await getFamilyMembers(family.id)
          set({ family, myProfile, members, isLoading: false })

          if (myProfile) {
            registerForPushNotifications()
              .then((token) => {
                if (token) {
                  supabase
                    .from('family_members')
                    .update({ push_token: token })
                    .eq('id', myProfile.id)
                    .then(() => {})
                }
              })
              .catch(() => {})
          }
        } catch (err) {
          set({ error: String(err), isLoading: false })
        }
      },

      refreshFamily: async () => {
        const family = await getMyFamily()
        set({ family })
      },

      isPro: () => get().family?.subscription_status === 'active',

      reset: () => set({ family: null, members: [], myProfile: null, isHydrated: false }),
    }),
    {
      name: 'medivault-family',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the data, not loading/error states
      partialize: (state) => ({
        family: state.family,
        members: state.members,
        myProfile: state.myProfile,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
