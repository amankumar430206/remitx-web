import { useState } from 'react'
import { getApiError } from '@/lib/apiError'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Input, FormField } from '@/components/ui/index'
import { AuthShell } from './Login'
import authApi from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'

const schema = z.object({ code: z.string().length(6, 'Enter 6-digit code') })
type FormData = z.infer<typeof schema>

export function MfaChallenge() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = (location.state as { token?: string })?.token ?? ''
  const tenantSlug = useAuthStore(s => s.tenantSlug) ?? ''
  const setAuth = useAuthStore(s => s.setAuth)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ code }: FormData) => {
    setServerError('')
    try {
      const { data } = await authApi.mfaChallenge(token, code)
      const res = data.data
      setAuth(res.user, res.accessToken, res.refreshToken, tenantSlug)
      navigate('/dashboard')
    } catch (err) {
      setServerError(getApiError(err, 'Invalid code. Please try again.'))
    }
  }

  return (
    <AuthShell title="Two-factor authentication">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <p className="text-sm text-muted-fg text-center">Enter the 6-digit code from your authenticator app.</p>
        <FormField label="Authentication code" error={errors.code?.message} htmlFor="code">
          <Input id="code" placeholder="000000" maxLength={6} autoFocus {...register('code')} error={!!errors.code} className="text-center tracking-widest text-lg" />
        </FormField>
        {serverError && <p className="text-sm text-danger-fg">{serverError}</p>}
        <Button type="submit" loading={isSubmitting} className="w-full">Verify</Button>
      </form>
    </AuthShell>
  )
}
