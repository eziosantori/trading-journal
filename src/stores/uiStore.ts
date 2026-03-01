import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  activeAccountId: string | null
  setActiveAccountId: (id: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeAccountId: null,
      setActiveAccountId: (id) => set({ activeAccountId: id }),
    }),
    { name: 'ui-store' },
  ),
)
