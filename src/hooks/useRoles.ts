import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import tenantsApi from '@/api/tenants'
import type { CreateRolePayload, UpdateRolePayload } from '@/api/tenants'

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => tenantsApi.listRoles().then(r => r.data.data),
  })
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ['permission-catalog'],
    queryFn: () => tenantsApi.permissionCatalog().then(r => r.data.data),
    staleTime: Infinity, // catalog is static for the life of the app
  })
}

export function useRoleTemplates() {
  return useQuery({
    queryKey: ['role-templates'],
    queryFn: () => tenantsApi.roleTemplates().then(r => r.data.data),
    staleTime: Infinity, // templates are static for the life of the app
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => tenantsApi.createRole(payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: UpdateRolePayload }) =>
      tenantsApi.updateRole(key, payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => tenantsApi.deleteRole(key).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}
