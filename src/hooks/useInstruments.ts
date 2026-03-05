import { useQuery } from '@tanstack/react-query'
import { getInstruments } from '@/lib/api'

export function useInstruments() {
  return useQuery({
    queryKey: ['instruments'],
    queryFn: getInstruments,
    staleTime: 10 * 60 * 1000,
  })
}
