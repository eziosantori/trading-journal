import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  activeAccountId: string | null
  setActiveAccountId: (id: string) => void
  /** User-overridden locale (e.g. 'it-IT'). null = use browser locale. */
  localeOverride: string | null
  setLocaleOverride: (locale: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeAccountId: null,
      setActiveAccountId: (id) => set({ activeAccountId: id }),
      localeOverride: null,
      setLocaleOverride: (locale) => set({ localeOverride: locale }),
    }),
    { name: 'ui-store' },
  ),
)

/** Returns the effective locale: user override or browser default. */
export function useLocale(): string | undefined {
  return useUIStore((s) => s.localeOverride ?? undefined)
}
