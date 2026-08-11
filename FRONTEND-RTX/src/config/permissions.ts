/**
 * PWA-Optimized Public Routes
 * Only hardcode essential routes that MUST work offline
 * Other routes let API decide via 401 response
 */
import { essentialPublicRoutes, isEssentialPublicRoute } from '@/lib/indexedDB'

export { essentialPublicRoutes, isEssentialPublicRoute }

export const PermissionConfig = {
  isPublicRoute(route: string): boolean {
    return isEssentialPublicRoute(route)
  },
} as const

export type PublicPage = string