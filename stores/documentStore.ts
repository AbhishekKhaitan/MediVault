import { create } from 'zustand'
import type { Document } from '../types'
import { getDocumentsForMember } from '../lib/api'

interface DocumentStore {
  documents: Record<string, Document[]>  // keyed by member_id
  isLoading: boolean
  error: string | null
  loadDocumentsForMember: (memberId: string) => Promise<void>
  addDocument: (doc: Document) => void
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: {},
  isLoading: false,
  error: null,

  loadDocumentsForMember: async (memberId: string) => {
    set({ isLoading: true, error: null })
    try {
      const docs = await getDocumentsForMember(memberId)
      set((state) => ({
        documents: { ...state.documents, [memberId]: docs },
        isLoading: false,
      }))
    } catch (err) {
      set({ error: String(err), isLoading: false })
    }
  },

  addDocument: (doc: Document) => {
    set((state) => ({
      documents: {
        ...state.documents,
        [doc.member_id]: [doc, ...(state.documents[doc.member_id] ?? [])],
      },
    }))
  },
}))
