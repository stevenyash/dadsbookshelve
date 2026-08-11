import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../lib/store';
import { authApi, jobsApi } from '../lib/api';

export function useAuth() {
  const { user, token, isAuthenticated, isLoading, login: storeLogin, logout: storeLogout } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
    onSuccess: (data) => {
      // API returns { success: true, data: { token, user } }
      storeLogin(data.data.user, data.data.token);
    },
  });

  const logout = () => {
    storeLogout();
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutateAsync,
    logout,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
  };
}

export function useJobs(filters?: { status?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['jobs', filters],
    placeholderData: (previous) => previous ?? { jobs: [], records: [], page: 1, limit: 20, total: 0, totalPages: 0 },
    queryFn: async () => {
      try {
        const result = await jobsApi.list(filters);
        if (!result) return { jobs: [], records: [], page: 1, limit: 20, total: 0, totalPages: 0 };
        if (result.jobs) return result;
        if (result.records) return { ...result, jobs: result.records };
        return { jobs: [], records: [], page: 1, limit: 20, total: 0, totalPages: 0 };
      } catch {
        return { jobs: [], records: [], page: 1, limit: 20, total: 0, totalPages: 0 };
      }
    },
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id),
    enabled: !!id && useAuthStore.getState().isAuthenticated,
  });
}

export function useStartConversion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => jobsApi.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}

export function useRetryConversion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => jobsApi.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}

export function useFailConversion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, errorMessage }: { id: number; errorMessage: string }) => jobsApi.fail(id, errorMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}

export function useUploadConverted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => jobsApi.uploadConverted(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}

export function useGenerateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expiresInHours }: { id: number; expiresInHours?: number }) => jobsApi.generateLink(id, expiresInHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, channel, message }: { id: number; channel: string; message?: string }) => 
      jobsApi.notify(id, channel, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => jobsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => jobsApi.sendEmail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useSendSms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => jobsApi.sendSms(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useAuditLogs(ebookId: number) {
  return useQuery({
    queryKey: ['auditLogs', ebookId],
    queryFn: () => jobsApi.getAuditLogs(ebookId),
    enabled: !!ebookId,
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { book_title?: string; author?: string; isbn?: string; status?: string; payment_status?: string } }) => jobsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
}
