import { QueryClient, QueryKey } from '@tanstack/react-query'

// Cache durations (ms)
const STALE_TIMES = {
  // Change rarely - cache for days
  books: 24 * 60 * 60 * 1000, // 24 hours
  bookContent: 7 * 24 * 60 * 60 * 1000, // 7 days
  genres: 7 * 24 * 60 * 60 * 1000, // 7 days
  authors: 24 * 60 * 60 * 1000, // 24 hours
  featured: 60 * 60 * 1000, // 1 hour
  
  // User data - refresh frequently
  user: 5 * 60 * 1000, // 5 minutes
  wallet: 5 * 60 * 1000,
  
  // Dynamic - short cache
  default: 60 * 1000, // 1 minute
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIMES.default,
      gcTime: 10 * 60 * 60 * 1000, // 10 hours
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Helper to get stale time based on endpoint
export function getStaleTime(queryKey: QueryKey): number {
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey
  const keyStr = typeof key === 'string' ? key : ''
  
  if (keyStr.includes('books') && keyStr.includes('view')) return STALE_TIMES.bookContent
  if (keyStr.includes('books')) return STALE_TIMES.books
  if (keyStr.includes('genres')) return STALE_TIMES.genres
  if (keyStr.includes('authors')) return STALE_TIMES.authors
  if (keyStr.includes('featured')) return STALE_TIMES.featured
  if (keyStr.includes('wallet')) return STALE_TIMES.wallet
  if (keyStr.includes('currentuser')) return STALE_TIMES.user
  
  return STALE_TIMES.default
}

// Prefetch helpers for offline
export function prefetchForOffline<T>(key: QueryKey, fetcher: () => Promise<T>) {
  return queryClient.prefetchQuery({
    queryKey: key,
    queryFn: fetcher,
    staleTime: getStaleTime(key),
  })
}