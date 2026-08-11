import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStaleTime } from '@/lib/queryClient'
import { isEssentialPublicRoute } from '@/lib/indexedDB'
import api, { authApi, accountApi } from '@/lib/api'

// Generic query hook with PWA-optimized caching
export function useDataQuery<T>(
  key: string[],
  url: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: key,
    queryFn: () => api.get(url).then(r => r.data as T),
    staleTime: getStaleTime(key),
    enabled: options?.enabled ?? true,
  })
}

// User data with network-first (always fresh)
export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => accountApi.getCurrentUser().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

// Books with long cache (works offline)
export function useBooks(params?: { page?: number; limit?: number; search?: string }) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.search) query.set('search', params.search)
  
  return useDataQuery(
    ['books', params],
    `books/index?${query}`,
    { enabled: !isEssentialPublicRoute('/books') }
  )
}

export function useBook(id: string) {
  return useDataQuery(
    ['book', id],
    `books/view/${id}`,
    { enabled: !!id }
  )
}

export function useGenres() {
  return useDataQuery(['genres'], 'genres/index')
}

export function useFeaturedBooks() {
  return useDataQuery(['featured'], 'featuredbooks/index')
}

// Generic mutation hook
export function useMutate<TData, TVariables>(
  method: 'post' | 'put' | 'delete',
  url: string,
  options?: { onSuccess?: () => void }
) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: TVariables) => {
      const apiMethod = api[method]
      return apiMethod(url, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
      options?.onSuccess?.()
    },
  })
}