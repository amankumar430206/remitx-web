import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button, Input, FormField } from '@/components/ui/index'
import { AuthShell } from './Login'
import authApi from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'

const schema = z.object({
  password: z.string().min(12, 'Minimum 12 characters'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type FormData = z.infer<typeof schema>

export function InviteAccept() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const tenantSlug = useAuthStore(s => s.tenantSlug) ?? searchParams.get('tenant') ?? ''
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ password }: FormData) => {
    setServerError('')
    try {
      const { data } = await authApi.inviteAccept(token, password)
      const res = (data as { data: Parameters<typeof setAuth>[0] & { accessToken: string; refreshToken: string } }).data
      setAuth(res, res.accessToken, res.refreshToken, tenantSlug)
      navigate('/dashboard')
    } catch {
      setServerError('Invalid or expired invite link.')
    }
  }

  return (
    <AuthShell title="Accept your invitation">
      <p className="mb-4 text-sm text-center text-muted-fg">Set a password to activate your account.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Password" error={errors.password?.message} htmlFor="pw">
          <Input id="pw" type="password" {...register('password')} error={!!errors.password} />
        </FormField>
        <FormField label="Confirm password" error={errors.confirm?.message} htmlFor="cpw">
          <Input id="cpw" type="password" {...register('confirm')} error={!!errors.confirm} />
        </FormField>
        {serverError && <p className="text-sm text-danger-fg">{serverError}</p>}
        <Button type="submit" loading={isSubmitting} className="w-full">Activate account</Button>
      </form>
    </AuthShell>
  )
}
