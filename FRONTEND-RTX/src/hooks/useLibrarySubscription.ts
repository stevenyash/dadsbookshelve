import { useQuery, useQueryClient } from '@tanstack/react-query'
import { libraryApi } from '@/lib/api'

export function useLibrarySubscription(userId: string | undefined) {
  const queryClient = useQueryClient()
  
const query = useQuery({
    queryKey: ['library-subscription', userId],
    queryFn: async () => {
      if (!userId) return { active: false }
      try {
        const res = await libraryApi.checkActive(userId)
        return res.data
      } catch {
        return { active: false }
      }
    },
    enabled: !!userId,
    staleTime: 60000,
  })

  // Helper to refetch after payment
  const refetchSubscription = () => {
    queryClient.invalidateQueries({ queryKey: ['library-subscription', userId] })
  }

  return { ...query, refetchSubscription }
}