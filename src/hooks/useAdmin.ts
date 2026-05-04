import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import adminApi from '@/api/admin'
import type { AdminTenantDetail, ProviderConfig } from '@/api/admin'

export function useAdminTenants(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['admin-tenants', params],
    queryFn: () => adminApi.tenants.list(params).then(r => r.data),
  })
}

export function useAdminTenant(id: string) {
  return useQuery({
    queryKey: ['admin-tenants', id],
    queryFn: () => adminApi.tenants.get(id).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useUpdateAdminTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AdminTenantDetail> }) =>
      adminApi.tenants.update(id, payload).then(r => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-tenants'] })
      qc.invalidateQueries({ queryKey: ['admin-tenants', id] })
    },
  })
}

export function useSuspendTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.tenants.suspend(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenants'] }),
  })
}

export function useActivateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.tenants.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenants'] }),
  })
}

export function useKycQueue(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin-kyc-queue', params],
    queryFn: () => adminApi.kyc.queue(params).then(r => r.data),
    refetchInterval: 30_000,
  })
}

export function useApproveKyc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminApi.kyc.approve(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-kyc-queue'] }),
  })
}

export function useRejectKyc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.kyc.reject(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-kyc-queue'] }),
  })
}

export function useManualPaymentQueue(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin-manual-queue', params],
    queryFn: () => adminApi.payments.manualQueue(params).then(r => r.data),
    refetchInterval: 30_000,
  })
}

export function useProcessManualPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminApi.payments.process(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-manual-queue'] }),
  })
}

export function useFailManualPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.payments.fail(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-manual-queue'] }),
  })
}

export function useProviders() {
  return useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => adminApi.providers.list().then(r => r.data.data),
  })
}

export function useUpdateProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProviderConfig> }) =>
      adminApi.providers.update(id, payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-providers'] }),
  })
}
