import { create } from 'zustand'
import type { Family, FamilyMember } from '../types'
import { getMyFamily, getFamilyMembers, getMyMemberProfile } from '../lib/api'

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
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  reset: () => set({ family: null, members: [], myProfile: null }),
}))
