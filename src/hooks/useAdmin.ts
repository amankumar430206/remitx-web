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

export function useAdminTenantBeneficiaries(tenantId: string) {
  return useQuery({
    queryKey: ['admin-tenant-beneficiaries', tenantId],
    queryFn: () => adminApi.tenantBeneficiaries.list(tenantId).then(r => r.data.data),
    enabled: !!tenantId,
  })
}

export function useAdminTenantAccounts(tenantId: string) {
  return useQuery({
    queryKey: ['admin-tenant-accounts', tenantId],
    queryFn: () => adminApi.tenantAccounts.list(tenantId).then(r => r.data.data),
    enabled: !!tenantId,
  })
}

export function useCreateOnBehalfPayment() {
  return useMutation({
    mutationFn: (payload: Parameters<typeof adminApi.onBehalfPayment.create>[0]) =>
      adminApi.onBehalfPayment.create(payload).then(r => r.data.data),
  })
}

export function useTenantContact(tenantId: string) {
  return useQuery({
    queryKey: ['admin-tenant-contact', tenantId],
    queryFn: () => adminApi.contact.get(tenantId).then(r => r.data.data),
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
    mutationFn: ({ tenantId, ...payload }: {
      tenantId: string
      feeCategory: import('@/api/admin').FeeCategory
      sourceCurrency?: string | null
      destCurrency?: string | null
      inheritGlobal?: boolean
      feeType?: 'flat' | 'percent'
      feeValue?: number
      minFee?: number | null
      maxFee?: number | null
    }) => adminApi.fees.create(tenantId, payload).then(r => r.data.data),
    onSuccess: (_, { tenantId }) => qc.invalidateQueries({ queryKey: ['admin-fee-configs', tenantId] }),
  })
}

export function useUpdateFeeConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, feeId, ...payload }: { tenantId: string; feeId: string; inheritGlobal?: boolean; feeType?: 'flat' | 'percent'; feeValue?: number; minFee?: number | null; maxFee?: number | null; isActive?: boolean }) =>
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

export function useGlobalFeeConfigs() {
  return useQuery({
    queryKey: ['admin-global-fee-configs'],
    queryFn: () => adminApi.globalFees.list().then(r => r.data.data),
  })
}

export function useCreateGlobalFeeConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      feeCategory: import('@/api/admin').FeeCategory
      sourceCurrency?: string | null
      destCurrency?: string | null
      feeType: 'flat' | 'percent'
      feeValue: number
      minFee?: number | null
      maxFee?: number | null
    }) => adminApi.globalFees.create(payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-global-fee-configs'] }),
  })
}

export function useUpdateGlobalFeeConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ feeId, ...payload }: { feeId: string; feeType?: 'flat' | 'percent'; feeValue?: number; minFee?: number | null; maxFee?: number | null; isActive?: boolean }) =>
      adminApi.globalFees.update(feeId, payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-global-fee-configs'] }),
  })
}

export function useDeleteGlobalFeeConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (feeId: string) => adminApi.globalFees.delete(feeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-global-fee-configs'] }),
  })
}

export function useProviderConfig(tenantId: string) {
  return useQuery({
    queryKey: ['admin-providers', tenantId],
    queryFn: () => adminApi.providers.get(tenantId).then(r => r.data.data),
    enabled: !!tenantId,
  })
}

export function useSetTenantDefaultProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, providerName }: { tenantId: string; providerName: string | null }) =>
      adminApi.providers.setDefaultProvider(tenantId, providerName).then(r => r.data.data),
    onSuccess: (_, { tenantId }) => qc.invalidateQueries({ queryKey: ['admin-providers', tenantId] }),
  })
}

export function useProviderCredentials(tenantId: string) {
  return useQuery({
    queryKey: ['admin-provider-credentials', tenantId],
    queryFn: () => adminApi.providerCredentials.get(tenantId).then(r => r.data.data),
    enabled: !!tenantId,
  })
}

export function useSetProviderCredentials() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, providerName, config }: { tenantId: string; providerName: string; config: { user_id?: string } }) =>
      adminApi.providerCredentials.set(tenantId, { providerName, config }).then(r => r.data.data),
    onSuccess: (_, { tenantId }) => qc.invalidateQueries({ queryKey: ['admin-provider-credentials', tenantId] }),
  })
}

export function useTestProviderCredentials() {
  return useMutation({
    mutationFn: (tenantId: string) =>
      adminApi.providerCredentials.test(tenantId).then(r => r.data.data),
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

export function useAddTenantCorridor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tenantId,
      corridor,
    }: {
      tenantId: string
      corridor: { sourceCurrency: string; destCurrency?: string | null; providerName: string; priority?: number }
    }) => adminApi.providers.addCorridor(tenantId, corridor).then(r => r.data.data),
    onSuccess: (_, { tenantId }) => qc.invalidateQueries({ queryKey: ['admin-providers', tenantId] }),
  })
}

export function useDeleteTenantCorridor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, corridorId }: { tenantId: string; corridorId: string }) =>
      adminApi.providers.deleteCorridor(tenantId, corridorId),
    onSuccess: (_, { tenantId }) => qc.invalidateQueries({ queryKey: ['admin-providers', tenantId] }),
  })
}

export function useGlobalProviderConfig() {
  return useQuery({
    queryKey: ['admin-provider-defaults'],
    queryFn: () => adminApi.providerDefaults.list().then(r => r.data.data),
  })
}

export function useAddGlobalCorridor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (corridor: { sourceCurrency: string; destCurrency?: string | null; providerName: string; priority?: number }) =>
      adminApi.providerDefaults.add(corridor).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-provider-defaults'] }),
  })
}

export function useDeleteGlobalCorridor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (corridorId: string) => adminApi.providerDefaults.delete(corridorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-provider-defaults'] }),
  })
}

export function useAllAdminPayments(params: { page?: number; limit?: number; tenantId?: string; status?: string; providerName?: string }) {
  return useQuery({
    queryKey: ['admin-all-payments', params],
    queryFn: () => adminApi.payments.list(params).then(r => r.data),
  })
}
