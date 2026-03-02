import { useQuery } from '@tanstack/react-query'
import { getTrades } from '@/lib/api'

interface TradeFilters {
  accountId?: string
  instrument?: string
  from?: string
  to?: string
}

export function useTrades(filters?: TradeFilters) {
  return useQuery({
    queryKey: ['trades', filters],
    queryFn: () => getTrades(filters),
    staleTime: 2 * 60 * 1000,
  })
}
