import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authApi, accountApi } from '@/lib/api'
import { tokenStorage } from '@/lib/tokenStorage'
import { IndexedDBStorage } from '@/lib/indexedDB'

interface User {
  user_id: string
  name: string
  email: string
  telephone?: string
  country_code?: string
  national_id?: string
  is_profile_complete?: boolean
  role?: string
}

interface AuthState {
  login: (username: string, password: string) => Promise<unknown>
  user: User | null
  userRole: string
  userPages: string[]
  permissions: Record<string, string[]>
  customPermissions: CustomPermission[]
  isLoading: boolean
  isAuthenticated: boolean
  fetchUser: () => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateProfile: (data: ProfileData) => Promise<unknown>
}

interface CustomPermission {
  module_code: string
  module_name: string
  action_code: string
  action_name: string
  is_granted: boolean
  expires_at: string | null
  granted_by: number
}

interface ProfileData {
  name?: string
  telephone?: string
  country_code?: string
  national_id?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      userRole: '',
      userPages: [],
      permissions: {},
      customPermissions: [],
      isLoading: false,
      isAuthenticated: false,

      login: async (username: string, password: string, referral_code?: string) => {
        set({ isLoading: true })
        try {
          const res = await authApi.login({ username, password, referral_code })
          const data = res.data
          
          if (data.token) {
            tokenStorage.setToken(data.token, data.expires_in)
            if (data.refreshToken) {
              tokenStorage.setRefreshToken(data.refreshToken)
            }
            set({ isAuthenticated: true })
            
            const userRes = await authApi.me()
            const userData = userRes.data.data?.user || userRes.data.user
            
            if (userData) {
              get().setUserFromData(userData)
            }
            
            return data
          }
          
          throw new Error(data.message || 'Login failed')
        } catch (error) {
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      setUserFromData: (userData: Record<string, unknown>) => {
        set({
          user: {
            user_id: String(userData.user_id),
            name: userData.name as string,
            email: userData.email as string,
            telephone: userData.telephone as string | undefined,
            country_code: userData.country_code as string | undefined,
            national_id: userData.national_id as string | undefined,
            is_profile_complete: userData.is_profile_complete as boolean | undefined,
          },
          userRole: (userData.role_code as string) || (userData.role_name as string)?.toLowerCase() || 'user',
          userPages: [],
          permissions: (userData.permissions as Record<string, string[]>) || {},
          customPermissions: (userData.custom_permissions as CustomPermission[]) || [],
        })
      },

      fetchUser: async () => {
        if (!tokenStorage.hasToken()) {
          set({ isAuthenticated: false, user: null })
          return
        }
        
        try {
          const res = await authApi.me()
          const userData = res.data.data?.user || res.data.user
          
          if (!userData) {
            console.warn('[fetchUser] User data not found')
            return
          }
          
          get().setUserFromData(userData)
          set({ isAuthenticated: true })
        } catch (error) {
          console.warn('[fetchUser] Failed to fetch user')
          set({ isAuthenticated: false, user: null })
        }
      },

      logout: () => {
        tokenStorage.removeAuthData()
        set({
          user: null,
          userRole: '',
          userPages: [],
          permissions: {},
          customPermissions: [],
          isAuthenticated: false,
        })
      },

      checkAuth: async () => {
        if (tokenStorage.hasToken()) {
          set({ isAuthenticated: true })
          try {
            await get().fetchUser()
          } catch {
            set({ isAuthenticated: false })
          }
        } else {
          set({ isAuthenticated: false, user: null })
        }
      },

      updateProfile: async (data: ProfileData) => {
        set({ isLoading: true })
        try {
          const res = await accountApi.updateProfile(data)
          const profileData = res.data.data?.user || res.data.user
          
          if (profileData) {
            set((state) => ({
              user: state.user ? {
                ...state.user,
                name: profileData.name ?? state.user.name,
                telephone: profileData.telephone ?? state.user.telephone,
                country_code: profileData.country_code ?? state.user.country_code,
                national_id: profileData.national_id ?? state.user.national_id,
                is_profile_complete: profileData.is_profile_complete,
              } : null
            }))
          }
          
          return res.data
        } catch (error) {
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => IndexedDBStorage),
      partialize: (state) => ({
        user: state.user,
        userRole: state.userRole,
        userPages: state.userPages,
        permissions: state.permissions,
        customPermissions: state.customPermissions,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export type { AuthState }

export const useAuth = () => {
  const store = useAuthStore()

  const hasPermission = (module: string, action: string): boolean => {
    const modulePermissions = store.permissions[module]
    return modulePermissions ? modulePermissions.includes(action) : false
  }

  const hasAnyPermission = (module: string, actions: string[]): boolean => {
    const modulePermissions = store.permissions[module]
    return modulePermissions ? actions.some(action => modulePermissions.includes(action)) : false
  }

  const hasAllPermissions = (module: string, actions: string[]): boolean => {
    const modulePermissions = store.permissions[module]
    return modulePermissions ? actions.every(action => modulePermissions.includes(action)) : false
  }

  const canView = (module: string): boolean => hasPermission(module, 'VIEW')
  const canAdd = (module: string): boolean => hasPermission(module, 'CREATE')
  const canEdit = (module: string): boolean => hasPermission(module, 'EDIT')
  const canDelete = (module: string): boolean => hasPermission(module, 'DELETE')

  const isProfileComplete = store.user?.is_profile_complete ?? false

  return {
    user: store.user,
    userRole: store.userRole,
    userPages: store.userPages,
    permissions: store.permissions,
    customPermissions: store.customPermissions,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    login: store.login,
    logout: store.logout,
    fetchUser: store.fetchUser,
    checkAuth: store.checkAuth,
    updateProfile: store.updateProfile,
    isProfileComplete,
    isAdmin: store.userRole === 'admin' || store.userRole === 'super_admin',
    isSuperAdmin: store.userRole === 'super_admin',
    isMarketer: store.userRole === 'marketer',
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canView,
    canAdd,
    canEdit,
    canDelete,
  }
}