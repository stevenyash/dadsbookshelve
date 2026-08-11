import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8060/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => authToken;

// No need for interceptor - setAuthToken handles defaults

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    
    if (error.response?.status === 401) {
      setAuthToken(null);
      window.location.href = '/login';
      toast.error('Session expired. Please log in again.');
    } else if (error.response?.status !== 404) {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { username: email, password });
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

export const jobsApi = {
  list: async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const response = await api.get('/ebook-jobs', { params });
    // API returns { success: true, data: { records, page, limit, total, totalPages } }
    // Frontend expects { jobs, ... } - map records to jobs
    const data = response.data.data;
    return {
      ...data,
      jobs: data.records ?? [],
    };
  },
  get: async (id: number) => {
    const response = await api.get(`/ebook-jobs/${id}`);
    return response.data.data;
  },
  updateStatus: async (id: number, status: string) => {
    const response = await api.put(`/ebook-jobs/${id}/status`, { status });
    return response.data.data;
  },
  start: async (id: number) => {
    const response = await api.post(`/ebook-jobs/${id}/start`);
    return response.data.data;
  },
  retry: async (id: number) => {
    const response = await api.post(`/ebook-jobs/${id}/retry`);
    return response.data.data;
  },
  fail: async (id: number, errorMessage: string) => {
    const response = await api.post(`/ebook-jobs/${id}/fail`, { error_message: errorMessage });
    return response.data.data;
  },
  uploadConverted: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/ebook-jobs/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
  generateLink: async (id: number, expiresInHours?: number) => {
    const response = await api.post(`/ebook-jobs/${id}/link`, { expires_in_hours: expiresInHours });
    return response.data.data;
  },
  notify: async (id: number, channel: string, message?: string) => {
    const response = await api.post(`/ebook-jobs/${id}/notify`, { channel, message });
    return response.data.data;
  },
  getAuditLogs: async (id: number) => {
    const response = await api.get(`/ebook-jobs/${id}/audit`);
    return response.data.data;
  },
  getNotifications: async (id: number) => {
    const response = await api.get(`/ebook-jobs/${id}/notifications`);
    return response.data.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/ebook-jobs/${id}`);
    return response.data.data;
  },
  sendEmail: async (id: number) => {
    const response = await api.post(`/ebook-jobs/${id}/notify/email`);
    return response.data.data;
  },
  sendSms: async (id: number) => {
    const response = await api.post(`/ebook-jobs/${id}/notify/sms`);
    return response.data.data;
  },
  update: async (id: number, data: { book_title?: string; author?: string; isbn?: string; status?: string; payment_status?: string }) => {
    const response = await api.put(`/ebook-jobs/${id}`, data);
    return response.data.data;
  },
};

export const downloadApi = {
  downloadFile: async (url: string, filename: string) => {
    const response = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};
