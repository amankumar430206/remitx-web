import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import usersApi from '@/api/users'
import type { InvitePayload, UpdateUserPayload } from '@/api/users'

export function useUsers(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params).then(r => r.data),
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InvitePayload) => usersApi.invite(payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      usersApi.update(id, payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useRemoveUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (payload: { name: string; email: string }) => usersApi.updateProfile(payload),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      usersApi.changePassword(payload),
  })
}
