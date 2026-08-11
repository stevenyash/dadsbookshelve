import axios from 'axios'
import { tokenStorage } from './tokenStorage'
import { responseInterceptor } from './interceptor'

const API_BASE = import.meta.env.VITE_API_URL
const BASE_URL = `${API_BASE}/api`

export const API_BASE_URL = API_BASE

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = tokenStorage.getToken()
  console.log('[api request interceptor] Token from storage:', token?.substring(0, 20) + '...')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  responseInterceptor.onFulfilled,
  responseInterceptor.onRejected
)

export const authApi = {
  login: (data: { username: string; password: string; referral_code?: string }) => api.post('auth/login', data),
  register: (data: { username: string; password: string; email?: string; name?: string }) => api.post('auth/register', data),
  forgotPassword: (email: string) => api.post('auth/forgotpassword', { email }),
  resetPassword: (data: { token: string; password: string }) => api.post('auth/reset-password', data),
  me: () => api.get('auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('auth/change-password', data),
  refreshToken: () => api.post('auth/refresh-token'),
  logout: () => Promise.resolve(),
}

export const accountApi = {
  getCurrentUser: () => api.get('auth/me'),
  updateProfile: (data: { name?: string; telephone?: string; country_code?: string; national_id?: string }) => api.post('auth/edit', data),
}

export const libraryApi = {
  checkActive: (userId: string) => api.get(`dslibrarypayments/user/${userId}/active`),
  getPlans: () => api.get('dslibrarypayments/plans'),
  subscribe: (data: { user_id: string; access_id: string; phone: string; referral_code?: string; referralCode?: string }) => api.post('dslibrarypayments/subscribe', data),
  checkStatus: (checkoutRequestId: string) => api.post('dslibrarypayments/check-status', { checkoutRequestId }),
  confirmPayment: (data: { checkoutRequestId: string; userId: string; access_id?: string; amount?: string; phone?: string }) => api.post('payments/confirm-payment', data),
}

export const paymentModuleApi = {
  initiate: (data: {
    user_id: number; amount: number; method: 'mpesa' | 'paypal'; reference: string; module: string; metadata?: Record<string, unknown>; phone?: string; description?: string; currency?: string
  }) => api.post('payments/initiate', data),
  verify: (checkoutRequestId: string, module: string) => api.post('payments/verify', { checkoutRequestId, module }),
  getModules: () => api.get('payments/modules'),
  createPayPal: (data: { user_id: number; amount: number; currency?: string; module: string; metadata?: Record<string, unknown>; description?: string }) => api.post('payments/create-paypal', data),
  capturePayPal: (orderId: string, userId: number) => api.post('payments/capture-paypal', { orderId, user_id: userId }),
  verifyPayPal: (orderId: string) => api.get(`payments/verify-paypal/${orderId}`),
  getExchangeRate: (fromCurrency: string, toCurrency: string) => api.get(`exchangerates/view/${fromCurrency}/${toCurrency}`),
}

export const ebookUploadApi = {
  uploadFile: (type: string, file: File) => {
    const formData = new FormData()
    formData.append('files', file)
    return api.post(`ebookuploader/upload/${type}`, formData, { headers: { 'Content-Type': undefined } })
  },
  create: (data: unknown) => api.post('ebookuploader/create', data),
  list: (params?: Record<string, unknown>) => api.get('ebookuploader/index', { params }),
  update: (id: number, data: unknown) => api.post(`ebookuploader/edit/${id}`, data),
  delete: (id: number) => api.get(`ebookuploader/delete/${id}`),
  view: (id: number) => api.get(`ebookuploader/view/${id}`),
}

export const ebookPaymentApi = {
  list: (params?: Record<string, unknown>) => api.get('payments/index', { params }),
  view: (id: number) => api.get(`payments/view/${id}`),
  create: (data: unknown) => api.post('payments/add', data),
  update: (id: number, data: unknown) => api.put(`payments/edit/${id}`, data),
  delete: (id: number) => api.delete('payments/delete', { data: { ids: [id] } }),
}

export const paymentApi = {
  list: (params?: Record<string, unknown>) => api.get('payments/index', { params }),
  view: (id: number) => api.get(`payments/view/${id}`),
  create: (data: unknown) => api.post('payments/add', data),
  update: (id: number, data: unknown) => api.put(`payments/edit/${id}`, data),
  delete: (id: number) => api.delete('payments/delete', { data: { ids: [id] } }),
}

export const bookApi = {
  list: (params?: Record<string, unknown>) => api.get('books/index', { params }),
  view: (id: number) => api.get(`books/view/${id}`),
  create: (data: unknown) => api.post('books/add', data),
  update: (id: number, data: unknown) => api.put(`books/edit/${id}`, data),
  delete: (id: number) => api.delete('books/delete', { data: { ids: [id] } }),
}

export const marketerApi = {
  list: (params?: Record<string, unknown>) => api.get('marketers', { params }),
  get: (id: number) => api.get(`marketers/view/${id}`),
  update: (id: number, data: { mpesa_phone?: string; is_active?: boolean; commission_rate?: number; tier?: string; status?: string }) => api.put(`marketers/edit/${id}`, data),
  commissions: (id: number, params?: Record<string, unknown>) => api.get(`marketers/${id}/commissions`, { params }),
  payouts: (id: number, params?: Record<string, unknown>) => api.get(`marketers/${id}/payouts`, { params }),
  rates: (params?: Record<string, unknown>) => api.get('commission-rates', { params }),
  adminCreate: (data: { firstName: string; lastName: string; email: string; phone?: string; mpesaPhone?: string }) => api.post('marketers/add', data),
  adminBulkCreate: (marketers: unknown[]) => api.post('marketers/add', { action: 'bulk_create', marketers }),
  adminResendWelcome: (marketerId: number) => api.post('marketers/add', { action: 'send_welcome', marketerId }),
  adminSendSms: (marketerId: number, message: string) => api.post('marketers/add', { action: 'send_sms', marketerId, message }),
  adminSendEmail: (marketerId: number, subject: string, htmlContent: string) => api.post('marketers/add', { action: 'send_email', marketerId, subject, htmlContent }),
  sendSms: (data: { phoneNumber: string; message: string }) => api.post('sms', data),
  sendEmail: (data: { to: string; subject: string; htmlContent: string }) => api.post('email', data),
}

export default api