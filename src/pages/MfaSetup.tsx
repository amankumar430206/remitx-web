import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, FormField, Spinner } from '@/components/ui/index'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { ContentCard } from '@/layouts/ContentCard'
import authApi from '@/api/auth'

const schema = z.object({ code: z.string().length(6, 'Enter 6-digit code') })
type FormData = z.infer<typeof schema>

export function MfaSetup() {
  const navigate = useNavigate()
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['mfa-setup'],
    queryFn: () => authApi.mfaSetup().then(r => r.data.data),
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ code }: FormData) => {
    setServerError('')
    try {
      await authApi.mfaVerify(code)
      setDone(true)
    } catch {
      setServerError('Invalid code. Try scanning the QR again.')
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-xl font-bold text-foreground">MFA enabled</h2>
        <p className="mt-2 text-sm text-muted-fg">Your account is now protected with two-factor authentication.</p>
        <Button className="mt-6" onClick={() => navigate('/settings/profile')}>Done</Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <PageHeader title="Set up two-factor authentication" description="Scan the QR code with your authenticator app." />
      <ContentCard className="flex flex-col gap-6 mt-2">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <>
            <div className="flex justify-center">
              {data?.qrUri && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.qrUri)}`} alt="MFA QR code" className="rounded-lg border border-border" />}
            </div>
            <div>
              <p className="text-xs text-muted-fg mb-1">Or enter manually:</p>
              <code className="block rounded bg-muted px-3 py-2 text-sm font-mono break-all">{data?.secret}</code>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField label="Verification code" error={errors.code?.message} htmlFor="code">
                <Input id="code" placeholder="000000" maxLength={6} {...register('code')} error={!!errors.code} className="text-center tracking-widest text-lg" />
              </FormField>
              {serverError && <p className="text-sm text-danger-fg">{serverError}</p>}
              <Button type="submit" loading={isSubmitting} className="w-full">Enable MFA</Button>
            </form>
          </>
        )}
      </ContentCard>
    </div>
  )
}
