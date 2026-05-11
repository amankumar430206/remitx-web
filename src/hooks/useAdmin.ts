import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import adminApi from '@/api/admin'

export function useCreateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { slug: string; name: string; adminEmail: string }) =>
      adminApi.tenants.create(payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenants'] }),
  })
}

export function useTenantUsers(tenantId: string) {
  return useQuery({
    queryKey: ['admin-tenant-users', tenantId],
    queryFn: () => adminApi.users.list(tenantId).then(r => r.data.data),
    enabled: !!tenantId,
  })
}

export function useAdminTenants() {
  return useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => adminApi.tenants.list().then(r => r.data.data),
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
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      adminApi.tenants.update(id, { name }).then(r => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-tenants'] })
      qc.invalidateQueries({ queryKey: ['admin-tenants', id] })
    },
  })
}

export function useSetTenantStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' | 'inactive' }) =>
      adminApi.tenants.setStatus(id, status).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenants'] }),
  })
}

export function useKycQueue() {
  return useQuery({
    queryKey: ['admin-kyc-queue'],
    queryFn: () => adminApi.kyc.queue().then(r => r.data.data),
    refetchInterval: 30_000,
  })
}

export function useApproveKyc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, userId, note }: { tenantId: string; userId: string; note?: string }) =>
      adminApi.kyc.approve(tenantId, userId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-kyc-queue'] }),
  })
}

export function useRejectKyc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, userId, reason }: { tenantId: string; userId: string; reason: string }) =>
      adminApi.kyc.reject(tenantId, userId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-kyc-queue'] }),
  })
}

export function useManualPaymentQueue() {
  return useQuery({
    queryKey: ['admin-manual-queue'],
    queryFn: () => adminApi.payments.manualQueue().then(r => r.data.data),
    refetchInterval: 30_000,
  })
}

export function useProcessManualPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes, providerRef }: { id: string; notes?: string; providerRef?: string }) =>
      adminApi.payments.process(id, 'complete', notes, providerRef),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-manual-queue'] }),
  })
}

export function useFailManualPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      adminApi.payments.process(id, 'fail', notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-manual-queue'] }),
  })
}

export function useFeeConfigs(tenantId: string) {
  return useQuery({
    queryKey: ['admin-fee-configs', tenantId],
    queryFn: () => adminApi.fees.list(tenantId).then(r => r.data.data),
    enabled: !!tenantId,
  })
}

export function useCreateFeeConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, ...payload }: { tenantId: string; sourceCurrency: string; destCurrency?: string | null; feeType: 'flat' | 'percent'; feeValue: number; minFee?: number | null; maxFee?: number | null }) =>
      adminApi.fees.create(tenantId, payload).then(r => r.data.data),
    onSuccess: (_, { tenantId }) => qc.invalidateQueries({ queryKey: ['admin-fee-configs', tenantId] }),
  })
}

export function useUpdateFeeConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, feeId, ...payload }: { tenantId: string; feeId: string; feeType?: 'flat' | 'percent'; feeValue?: number; minFee?: number | null; maxFee?: number | null; isActive?: boolean }) =>
      adminApi.fees.update(tenantId, feeId, payload).then(r => r.data.data),
    onSuccess: (_, { tenantId }) => qc.invalidateQueries({ queryKey: ['admin-fee-configs', tenantId] }),
  })
}

export function useDeleteFeeConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, feeId }: { tenantId: string; feeId: string }) =>
      adminApi.fees.delete(tenantId, feeId),
    onSuccess: (_, { tenantId }) => qc.invalidateQueries({ queryKey: ['admin-fee-configs', tenantId] }),
  })
}

export function useProviderConfig(tenantId: string) {
  return useQuery({
    queryKey: ['admin-providers', tenantId],
    queryFn: () => adminApi.providers.get(tenantId).then(r => r.data.data),
    enabled: !!tenantId,
  })
}

export function useUpdateProviderConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tenantId,
      corridors,
    }: {
      tenantId: string
      corridors: Array<{ sourceCurrency: string; destCurrency?: string; providerName: string; priority?: number }>
    }) => adminApi.providers.update(tenantId, corridors).then(r => r.data.data),
    onSuccess: (_, { tenantId }) => qc.invalidateQueries({ queryKey: ['admin-providers', tenantId] }),
  })
}
