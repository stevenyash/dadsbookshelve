import axios from 'axios'
import { tokenStorage } from './tokenStorage'

const API_BASE = import.meta.env.VITE_API_URL
const BASE_URL = `${API_BASE}/api`

export const API_BASE_URL = API_BASE

export const createApiClient = (baseUrl: string = BASE_URL) => {
  const client = axios.create({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  })

  client.interceptors.request.use((config) => {
    const token = tokenStorage.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    config.headers['X-Request-ID'] = crypto.randomUUID()
    return config
  })

  return client
}

export const createPublicClient = (baseUrl: string = BASE_URL) => {
  return axios.create({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  })
}