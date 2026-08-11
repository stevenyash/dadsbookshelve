import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { api } from './api'
import { tokenStorage } from './tokenStorage'

interface ApiErrorResponse {
  success?: boolean
  error?: string
  message?: string
  data?: { message?: string }
}

export interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let unauthorizedHandler: (() => void) | null = null

export const setUnauthorizedHandler = (handler: () => void) => {
  unauthorizedHandler = handler
}

const MAX_RETRIES = 1
const RETRY_DELAY = 1000

const publicPaths = [
  '/limitless', '/about_limitless', '/donations', '/components_data',
  '/libraryaccess', '/featuredbooks', '/currentsliders', '/books/index',
  '/books/view', '/books/shop', '/sliders', '/genres', '/exchangerates',
  '/stories', '/story', '/dslibrarypayments', '/ebook/pricing', '/user-home',
  '/dbslibrary', '/ebook', '/ebookuploader', '/pricelist', '/archive',
  '/auth/me', '/auth/login', '/auth/register', '/auth/forgotpassword',
  '/auth/refresh-token', '/exchangerates/view',
]

export const isPublicPath = (url: string): boolean => {
  const path = url.split('?')[0].replace('/api/', '/')
  return publicPaths.some(p => path === p || path.startsWith(p + '/'))
}

let isRefreshing = false
const refreshSubscribers: Array<(token: string) => void> = []

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback)
}

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers.length = 0
}

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = tokenStorage.getRefreshToken()
  console.log('[refreshAccessToken] refreshToken exists:', !!refreshToken)
  if (!refreshToken) return null

  try {
    console.log('[refreshAccessToken] Calling /api/auth/refresh')
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
    })
    console.log('[refreshAccessToken] Response status:', res.status)
    if (!res.ok) return null
    
    const data = await res.json()
    console.log('[refreshAccessToken] Response data:', data)
    if (data.data?.token) {
      console.log('[refreshAccessToken] New token received:', data.data.token.substring(0, 20) + '...')
      tokenStorage.setToken(data.data.token, data.data.expires_in)
      return data.data.token
    } else {
      console.log('[refreshAccessToken] No token in response, data:', data)
    }
    return null
  } catch (e) {
    console.log('[refreshAccessToken] Error:', e)
    return null
  }
}

interface ApiErrorResponse {
  success?: boolean
  error?: string
  message?: string
  data?: { message?: string }
}

export const responseInterceptor = {
  onFulfilled: (response: AxiosResponse<ApiErrorResponse>) => {
    if (response.data?.success !== undefined) {
      const { success, data, message, ...rest } = response.data
      if (data && typeof data === 'object') {
        Object.assign(response.data, data, { success, message, ...rest })
      }
    }
    return response
  },

  onRejected: async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as RetryConfig
    if (!originalRequest) return Promise.reject(error)

    const url = originalRequest.url ?? ''
    const status = error.response?.status

    if (error.response?.data) {
      const responseData = error.response.data as ApiErrorResponse
      const errMsg = responseData.error
      const message = responseData.message
      const data = responseData.data
      
      if (errMsg && !message) {
        error.response.data.message = errMsg
      } else if (data?.message && !message) {
        error.response.data.message = data.message
      }
    }

    if (status === 401 && !isPublicPath(url)) {
      console.log('[Interceptor] 401 on:', url, 'retry:', originalRequest._retry)
      
      if (originalRequest._retry) {
        console.log('[Interceptor] Already retried, propagate error for debugging')
        return Promise.reject(error)
      }

      if (!isRefreshing) {
        console.log('[Interceptor] Starting token refresh')
        isRefreshing = true
        originalRequest._retry = true

        const newToken = await refreshAccessToken()
        
        if (newToken) {
          console.log('[Interceptor] Got new token, retrying request')
          console.log('[Interceptor] Token from refresh:', newToken?.substring(0, 20) + '...')
          console.log('[Interceptor] Stored token before retry:', tokenStorage.getToken()?.substring(0, 20) + '...')
          isRefreshing = false
          onTokenRefreshed(newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          originalRequest.baseURL = api.defaults.baseURL
          console.log('[Interceptor] Config headers:', originalRequest.headers.Authorization?.substring(0, 20) + '...')
          return api(originalRequest)
        }

        console.log('[Interceptor] Refresh failed, propagate error for debugging')
        isRefreshing = false
        return Promise.reject(error)
      }

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          originalRequest.baseURL = api.defaults.baseURL
          resolve(api(originalRequest))
        })
        setTimeout(() => reject(new Error('Token refresh timeout')), RETRY_DELAY * 2)
      })
    }

    if (status === 429) {
      const delay = parseInt(error.response?.headers['retry-after'] ?? '0') * 1000 || RETRY_DELAY
      if (!originalRequest._retry) {
        originalRequest._retry = true
        originalRequest.baseURL = api.defaults.baseURL
        return new Promise(resolve => {
          setTimeout(() => resolve(api(originalRequest)), delay)
        })
      }
    }

    return Promise.reject(error)
  }
}

export const normalizeResponse = (data: unknown): unknown => {
  if (data && typeof data === 'object' && 'success' in data) {
    const { success, data: payload, message, ...rest } = data as Record<string, unknown>
    if (payload && typeof payload === 'object') {
      return { ...payload, success, message }
    }
    return { success, message, ...rest }
  }
  return data
}