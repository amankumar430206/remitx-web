import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Input, FormField } from '@/components/ui/index'
import { AuthShell } from './Login'
import authApi from '@/api/auth'

const requestSchema = z.object({ email: z.string().email('Invalid email') })
const resetSchema = z.object({
  password: z.string().min(12, 'Minimum 12 characters'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type RequestData = z.infer<typeof requestSchema>
type ResetData = z.infer<typeof resetSchema>

export function PasswordReset() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [sent, setSent] = useState(false)
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')

  const requestForm = useForm<RequestData>({ resolver: zodResolver(requestSchema) })
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) })

  const onRequest = async ({ email }: RequestData) => {
    setServerError('')
    try {
      await authApi.passwordResetRequest(email)
      setSent(true)
    } catch {
      setServerError('Could not send reset email. Check the address and try again.')
    }
  }

  const onReset = async ({ password }: ResetData) => {
    setServerError('')
    try {
      await authApi.passwordReset(token!, password)
      setDone(true)
    } catch {
      setServerError('Reset link expired or invalid.')
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <p className="text-sm text-center text-muted-fg">We sent a password reset link. Check your inbox.</p>
        <Link to="/login" className="mt-4 block text-center text-sm text-primary hover:underline">Back to sign in</Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title="Password updated">
        <p className="text-sm text-center text-muted-fg">Your password has been reset successfully.</p>
        <Link to="/login" className="mt-4 block text-center text-sm text-primary hover:underline">Sign in</Link>
      </AuthShell>
    )
  }

  if (token) {
    return (
      <AuthShell title="Set new password">
        <form onSubmit={resetForm.handleSubmit(onReset)} className="flex flex-col gap-4">
          <FormField label="New password" error={resetForm.formState.errors.password?.message} htmlFor="pw">
            <Input id="pw" type="password" {...resetForm.register('password')} error={!!resetForm.formState.errors.password} />
          </FormField>
          <FormField label="Confirm password" error={resetForm.formState.errors.confirm?.message} htmlFor="cpw">
            <Input id="cpw" type="password" {...resetForm.register('confirm')} error={!!resetForm.formState.errors.confirm} />
          </FormField>
          {serverError && <p className="text-sm text-danger-fg">{serverError}</p>}
          <Button type="submit" loading={resetForm.formState.isSubmitting} className="w-full">Reset password</Button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Reset your password">
      <form onSubmit={requestForm.handleSubmit(onRequest)} className="flex flex-col gap-4">
        <FormField label="Email address" error={requestForm.formState.errors.email?.message} htmlFor="email">
          <Input id="email" type="email" placeholder="you@company.com" {...requestForm.register('email')} error={!!requestForm.formState.errors.email} />
        </FormField>
        {serverError && <p className="text-sm text-danger-fg">{serverError}</p>}
        <Button type="submit" loading={requestForm.formState.isSubmitting} className="w-full">Send reset link</Button>
        <Link to="/login" className="text-center text-sm text-primary hover:underline">Back to sign in</Link>
      </form>
    </AuthShell>
  )
}
