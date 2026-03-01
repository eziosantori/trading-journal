import { useQuery } from '@tanstack/react-query'
import { getAccounts, getDashboardStats } from '@/lib/api'
import { useUIStore } from '@/stores/uiStore'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDashboardStats() {
  const accountId = useUIStore((s) => s.activeAccountId)
  return useQuery({
    queryKey: ['dashboard', accountId],
    queryFn: () => getDashboardStats(accountId!),
    enabled: !!accountId,
    refetchInterval: 60 * 1000,
  })
}
