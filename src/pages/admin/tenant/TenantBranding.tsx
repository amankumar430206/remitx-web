import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FormField } from '@/components/ui/molecules/FormField'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import adminApi from '@/api/admin'

const schema = z.object({
  primaryColor:   z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  fontFamily:     z.string().min(1, 'Required'),
  companyName:    z.string().min(1, 'Required'),
  logoUrl:        z.string().url('Must be a valid URL').or(z.literal('')).optional(),
})
type FormValues = z.infer<typeof schema>

const FONT_OPTIONS = [
  { value: 'Inter',     label: 'Inter' },
  { value: 'DM Sans',   label: 'DM Sans' },
  { value: 'Geist',     label: 'Geist' },
  { value: 'System UI', label: 'System UI' },
  { value: 'Poppins',   label: 'Poppins' },
]

interface TenantBrandingProps {
  tenantId: string
}

export function TenantBranding({ tenantId }: TenantBrandingProps) {
  const qc = useQueryClient()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-tenant-branding', tenantId],
    queryFn: () => adminApi.tenants.getBranding(tenantId).then(r => r.data.data),
    enabled: !!tenantId,
  })

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      primaryColor:   '#1a56db',
      secondaryColor: '#7e3af2',
      fontFamily:     'Inter',
      companyName:    '',
      logoUrl:        '',
    },
  })

  useEffect(() => {
    if (data) {
      reset({
        primaryColor:   data.primaryColor   ?? '#1a56db',
        secondaryColor: data.secondaryColor ?? '#7e3af2',
        fontFamily:     data.fontFamily     ?? 'Inter',
        companyName:    data.tenantName     ?? '',
        logoUrl:        data.logoUrl        ?? '',
      })
      setLogoPreview(data.logoUrl || null)
    }
  }, [data, reset])

  const logoUrl        = watch('logoUrl')
  const primaryColor   = watch('primaryColor')
  const secondaryColor = watch('secondaryColor')

  useEffect(() => {
    if (logoUrl && logoUrl.startsWith('http')) setLogoPreview(logoUrl)
    else if (!logoUrl) setLogoPreview(null)
  }, [logoUrl])

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      adminApi.tenants.updateBranding(tenantId, {
        primaryColor:   values.primaryColor,
        secondaryColor: values.secondaryColor,
        fontFamily:     values.fontFamily,
        companyName:    values.companyName,
        logoUrl:        values.logoUrl || null,
      }).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tenant-branding', tenantId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  if (isLoading) return <LoadingState message="Loading branding settings…" />
  if (isError) return <ErrorState title="Could not load branding" onRetry={refetch} />

  return (
    <form onSubmit={handleSubmit(v => saveMutation.mutate(v))}>
      <div className="flex flex-col gap-6 max-w-xl">

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-lg border border-info-fg/30 bg-info/10 px-4 py-3">
          <svg className="h-4 w-4 text-info-fg shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-info-fg leading-relaxed">
            These settings override the global platform defaults for this client workspace.
            Changes take effect immediately when the client logs in next time.
          </p>
        </div>

        {/* Brand name */}
        <FormField label="Brand / company name" error={errors.companyName?.message} required htmlFor="companyName">
          <Input id="companyName" placeholder="Acme Corp" {...register('companyName')} />
        </FormField>

        {/* Logo */}
        <div className="flex flex-col gap-2">
          <FormField label="Logo URL" error={errors.logoUrl?.message} htmlFor="logoUrl"
            description="HTTPS image URL (PNG, SVG, or JPEG). Displayed at 28 px height in the client's navigation bar.">
            <Input
              id="logoUrl"
              placeholder="https://cdn.acme.com/logo.png"
              {...register('logoUrl')}
              error={!!errors.logoUrl}
            />
          </FormField>

          {logoPreview ? (
            <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-surface-raised">
              {/* Nav-bar simulation */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f172a] shrink-0">
                <div className="h-7 flex items-center overflow-hidden">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-7 w-auto max-w-[120px] object-contain"
                    onError={() => setLogoPreview(null)}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Navigation preview</p>
                <p className="text-[11px] text-muted-fg mt-0.5">Cropped to 28 px height, max 120 px width</p>
              </div>
              <button
                type="button"
                onClick={() => { setValue('logoUrl', ''); setLogoPreview(null) }}
                className="ml-auto text-xs text-danger-fg hover:underline shrink-0"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-surface-raised text-xs text-muted-fg">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21l6.75-6.75m0 0l.75-.75M16.5 3.75h4.5v4.5M16.5 3.75l4.5 4.5" />
              </svg>
              No logo set — client will see default RemitX branding
            </div>
          )}
        </div>

        {/* Font */}
        <FormField label="Font family" error={errors.fontFamily?.message} required>
          <Select
            value={watch('fontFamily')}
            onValueChange={v => setValue('fontFamily', v)}
            options={FONT_OPTIONS}
          />
        </FormField>

        {/* Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Primary colour" error={errors.primaryColor?.message} required htmlFor="primaryColor">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setValue('primaryColor', e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-border shrink-0"
              />
              <Input
                id="primaryColor"
                {...register('primaryColor')}
                className="font-mono uppercase"
                maxLength={7}
                error={!!errors.primaryColor}
              />
            </div>
          </FormField>

          <FormField label="Secondary colour" error={errors.secondaryColor?.message} required htmlFor="secondaryColor">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={e => setValue('secondaryColor', e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-border shrink-0"
              />
              <Input
                id="secondaryColor"
                {...register('secondaryColor')}
                className="font-mono uppercase"
                maxLength={7}
                error={!!errors.secondaryColor}
              />
            </div>
          </FormField>
        </div>

        {/* Swatch preview */}
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-28 rounded-lg flex items-center justify-center text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            Primary
          </div>
          <div
            className="h-9 w-28 rounded-lg flex items-center justify-center text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: secondaryColor }}
          >
            Secondary
          </div>
        </div>

        {/* Error / success */}
        {saveMutation.isError && (
          <div className="flex items-center gap-2.5 rounded-lg bg-danger border border-danger-border px-3.5 py-3">
            <svg className="h-4 w-4 text-danger-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-danger-fg">
              {(saveMutation.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to save branding'}
            </p>
          </div>
        )}

        {saved && (
          <div className="rounded-md bg-success px-4 py-2 text-sm text-success-fg">
            Branding saved. Will apply on the client's next login.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button type="submit" loading={saveMutation.isPending}>
            Save branding
          </Button>
        </div>
      </div>
    </form>
  )
}
