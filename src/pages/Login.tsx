import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input, FormField } from '@/components/ui/index'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'

const schema = z.object({
  tenantSlug: z.string().min(1, 'Workspace is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const tenantSlug = useAuthStore(s => s.tenantSlug)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tenantSlug: tenantSlug ?? '' },
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const result = await login({ email: data.email, password: data.password }, data.tenantSlug)
      if (result.mfaRequired) {
        navigate('/mfa/challenge', { state: { token: result.mfaChallengeToken } })
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      setServerError(msg ?? 'Invalid credentials')
    }
  }

  return (
    <AuthShell title="Sign in to RemitX">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Workspace" error={errors.tenantSlug?.message} htmlFor="slug">
          <Input id="slug" placeholder="your-company" {...register('tenantSlug')} error={!!errors.tenantSlug} />
        </FormField>
        <FormField label="Email" error={errors.email?.message} htmlFor="email">
          <Input id="email" type="email" placeholder="you@company.com" {...register('email')} error={!!errors.email} />
        </FormField>
        <FormField label="Password" error={errors.password?.message} htmlFor="password">
          <Input id="password" type="password" placeholder="••••••••" {...register('password')} error={!!errors.password} />
        </FormField>
        {serverError && <p className="text-sm text-danger-fg">{serverError}</p>}
        <Button type="submit" loading={isSubmitting} className="w-full mt-1">Sign in</Button>
        <p className="text-center text-sm text-muted-fg">
          <Link to="/password-reset" className="text-primary hover:underline">Forgot password?</Link>
        </p>
      </form>
    </AuthShell>
  )
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-raised px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-3xl font-bold text-primary">RemitX</span>
          <p className="mt-2 text-sm text-muted-fg">{title}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
