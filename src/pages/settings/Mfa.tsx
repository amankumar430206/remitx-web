import { useState } from 'react'
import { getApiError } from '@/lib/apiError'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { FormField } from '@/components/ui/molecules/FormField'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { ContentCard } from '@/layouts/ContentCard'
import authApi from '@/api/auth'

const schema = z.object({ code: z.string().length(6, 'Enter 6-digit code') })
type FormData = z.infer<typeof schema>

export function Mfa() {
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
    } catch (err) {
      setServerError(getApiError(err, 'Invalid code. Try scanning the QR code again.'))
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <PageHeader
        title="Two-factor authentication"
        breadcrumbs={[{ label: 'Settings' }, { label: 'MFA' }]}
      />

      {done ? (
        <ContentCard>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-fg text-2xl">✓</div>
            <h2 className="text-base font-semibold text-foreground">MFA enabled</h2>
            <p className="text-sm text-muted-fg">Your account is protected with two-factor authentication.</p>
          </div>
        </ContentCard>
      ) : (
        <ContentCard>
          <div className="flex flex-col gap-5">
            <p className="text-sm text-muted-fg">
              Scan the QR code below with your authenticator app (e.g. Google Authenticator, Authy), then enter the 6-digit code to confirm.
            </p>

            {isLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <>
                <div className="flex justify-center">
                  {data?.qrUri && (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.qrUri)}`}
                      alt="MFA QR code"
                      className="rounded-lg border border-border"
                    />
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted-fg mb-1">Or enter the secret key manually:</p>
                  <code className="block rounded bg-muted px-3 py-2 text-sm font-mono break-all">{data?.secret}</code>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <FormField label="Verification code" error={errors.code?.message} htmlFor="mfa-code">
                    <Input
                      id="mfa-code"
                      placeholder="000000"
                      maxLength={6}
                      {...register('code')}
                      error={!!errors.code}
                      className="text-center tracking-widest text-lg"
                    />
                  </FormField>
                  {serverError && (
                    <p className="text-sm text-danger-fg">{serverError}</p>
                  )}
                  <Button type="submit" loading={isSubmitting}>Enable MFA</Button>
                </form>
              </>
            )}
          </div>
        </ContentCard>
      )}
    </div>
  )
}
