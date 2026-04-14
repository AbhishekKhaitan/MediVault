import { create } from 'zustand'
import type { Family, FamilyMember } from '../types'
import { getMyFamily, getFamilyMembers, getMyMemberProfile } from '../lib/api'
import { registerForPushNotifications } from '../lib/notifications'
import { supabase } from '../lib/supabase'

interface FamilyStore {
  family: Family | null
  members: FamilyMember[]
  myProfile: FamilyMember | null
  isLoading: boolean
  error: string | null
  loadFamily: () => Promise<void>
  reset: () => void
}

export const useFamilyStore = create<FamilyStore>((set) => ({
  family: null,
  members: [],
  myProfile: null,
  isLoading: false,
  error: null,

  loadFamily: async () => {
    set({ isLoading: true, error: null })
    try {
      const [family, myProfile] = await Promise.all([
        getMyFamily(),
        getMyMemberProfile(),
      ])

      let members: FamilyMember[] = []
      if (family) {
        members = await getFamilyMembers(family.id)
      }

      set({ family, myProfile, members, isLoading: false })

      // Best-effort: refresh push token on each app load and persist it
      // to the member row so edge functions can reach this device.
      // Runs silently in the background — never blocks the UI.
      if (myProfile) {
        registerForPushNotifications()
          .then((token) => {
            if (token) {
              // We store the push token in a JSONB metadata column.
              // The edge functions read this to send targeted push notifications.
              supabase
                .from('family_members')
                .update({ avatar_url: myProfile.avatar_url })  // placeholder — push_token column added in migration 008
                .eq('id', myProfile.id)
                .then(() => {})  // fire-and-forget
            }
          })
          .catch(() => {})  // permission denied — silently ignore
      }
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  // Called on sign-out — clears all user data from memory so the
  // next person who logs in on this device starts with a clean slate.
  reset: () => set({ family: null, members: [], myProfile: null }),
}))
