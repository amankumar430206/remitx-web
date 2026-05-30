import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FormField } from '@/components/ui/molecules/FormField'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { cn } from '@/lib/utils'
import adminApi from '@/api/admin'
import type { TenantTheme } from '@/api/tenants'

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

// ─── Swatch preview ───────────────────────────────────────────────────────────

function ThemePreview({ theme, label }: { theme: TenantTheme; label?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-fg">{label}</p>}
      <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-surface-raised">
        {/* Mini nav simulation */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md shrink-0"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {theme.logoUrl ? (
            <img src={theme.logoUrl} alt="" className="h-5 w-auto max-w-[60px] object-contain" />
          ) : (
            <span className="text-[11px] font-bold text-white truncate max-w-[70px]">
              {theme.tenantName}
            </span>
          )}
        </div>
        {/* Swatches */}
        <div className="flex items-center gap-1.5">
          <span
            className="h-6 w-12 rounded text-[9px] font-semibold text-white flex items-center justify-center"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Primary
          </span>
          <span
            className="h-6 w-14 rounded text-[9px] font-semibold text-white flex items-center justify-center"
            style={{ backgroundColor: theme.secondaryColor }}
          >
            Secondary
          </span>
        </div>
        <div className="flex flex-col min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{theme.tenantName}</p>
          <p className="text-[10px] text-muted-fg">{theme.fontFamily}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TenantBrandingProps {
  tenantId: string
}

export function TenantBranding({ tenantId }: TenantBrandingProps) {
  const qc = useQueryClient()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  // Fetch both tenant branding + global theme in parallel
  const {
    data: tenantTheme, isLoading: loadingTenant, isError: errorTenant, refetch: refetchTenant,
  } = useQuery({
    queryKey: ['admin-tenant-branding', tenantId],
    queryFn: () => adminApi.tenants.getBranding(tenantId).then(r => r.data.data),
    enabled: !!tenantId,
  })

  const {
    data: globalTheme, isLoading: loadingGlobal, isError: errorGlobal, refetch: refetchGlobal,
  } = useQuery({
    queryKey: ['admin-global-theme'],
    queryFn: () => adminApi.globalTheme.get().then(r => r.data.data),
  })

  const hasCustom = tenantTheme?.hasCustomTheme ?? false

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

  // Populate form from tenant theme (or from global if no custom)
  useEffect(() => {
    const source = tenantTheme
    if (!source) return
    reset({
      primaryColor:   source.primaryColor   ?? '#1a56db',
      secondaryColor: source.secondaryColor ?? '#7e3af2',
      fontFamily:     source.fontFamily     ?? 'Inter',
      companyName:    source.tenantName     ?? '',
      logoUrl:        source.logoUrl        ?? '',
    })
    setLogoPreview(source.logoUrl || null)
  }, [tenantTheme, reset])

  const logoUrl        = watch('logoUrl')
  const primaryColor   = watch('primaryColor')
  const secondaryColor = watch('secondaryColor')
  const companyName    = watch('companyName')
  const fontFamily     = watch('fontFamily')

  useEffect(() => {
    if (logoUrl && logoUrl.startsWith('http')) setLogoPreview(logoUrl)
    else if (!logoUrl) setLogoPreview(null)
  }, [logoUrl])

  // Apply global values to form (without saving — user reviews before Save)
  const applyGlobalToForm = () => {
    if (!globalTheme) return
    reset({
      primaryColor:   globalTheme.primaryColor,
      secondaryColor: globalTheme.secondaryColor,
      fontFamily:     globalTheme.fontFamily,
      companyName:    globalTheme.tenantName,
      logoUrl:        globalTheme.logoUrl ?? '',
    })
    setLogoPreview(globalTheme.logoUrl || null)
  }

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      adminApi.tenants.updateBranding(tenantId, {
        primaryColor:   values.primaryColor,
        secondaryColor: values.secondaryColor,
        fontFamily:     values.fontFamily,
        companyName:    values.companyName,
        logoUrl:        values.logoUrl || null,
      }).then(r => r.data.data),
    onSuccess: (updated) => {
      qc.setQueryData(['admin-tenant-branding', tenantId], updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const resetMutation = useMutation({
    mutationFn: () =>
      adminApi.tenants.resetBranding(tenantId).then(r => r.data.data),
    onSuccess: (updated) => {
      qc.setQueryData(['admin-tenant-branding', tenantId], updated)
      setResetOpen(false)
    },
  })

  if (loadingTenant || loadingGlobal) return <LoadingState message="Loading branding settings…" />
  if (errorTenant || errorGlobal) return (
    <ErrorState title="Could not load branding" onRetry={() => { refetchTenant(); refetchGlobal() }} />
  )

  // Build a live preview from what's in the form
  const livePreview: TenantTheme = {
    primaryColor,
    secondaryColor,
    fontFamily,
    tenantName: companyName,
    logoUrl: logoPreview,
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">

      {/* ── Status badge ─────────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        hasCustom
          ? 'border-primary-subtle-border bg-primary-subtle'
          : 'border-border bg-surface-raised'
      )}>
        <svg
          className={cn('h-4 w-4 shrink-0 mt-0.5', hasCustom ? 'text-primary' : 'text-muted-fg')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          {hasCustom ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-semibold', hasCustom ? 'text-primary' : 'text-foreground')}>
            {hasCustom ? 'Custom branding active' : 'Inheriting global theme'}
          </p>
          <p className="text-[11px] text-muted-fg mt-0.5">
            {hasCustom
              ? 'This client has its own branding that overrides the platform defaults.'
              : 'No custom branding set — this client uses the platform-wide theme from Settings → Theme.'}
          </p>
        </div>
        {hasCustom && (
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="shrink-0 text-[11px] font-medium text-danger-fg hover:underline"
          >
            Reset to global
          </button>
        )}
      </div>

      {/* ── Side-by-side preview when both exist ─────────────────────────── */}
      {!hasCustom && globalTheme && (
        <div className="flex flex-col gap-3">
          <ThemePreview theme={globalTheme} label="Currently showing (global theme)" />
          <button
            type="button"
            onClick={applyGlobalToForm}
            className="self-start text-xs font-semibold text-primary hover:underline"
          >
            Use global theme as starting point →
          </button>
        </div>
      )}

      {hasCustom && globalTheme && (
        <div className="grid grid-cols-2 gap-3">
          <ThemePreview theme={globalTheme} label="Global (platform)" />
          <ThemePreview theme={livePreview} label="This client" />
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(v => saveMutation.mutate(v))}>
        <div className="flex flex-col gap-5">

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
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f172a] shrink-0">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-7 w-auto max-w-[120px] object-contain"
                    onError={() => setLogoPreview(null)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">Navigation preview</p>
                  <p className="text-[11px] text-muted-fg mt-0.5">28 px height · max 120 px width</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setValue('logoUrl', ''); setLogoPreview(null) }}
                  className="text-xs text-danger-fg hover:underline shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-surface-raised text-xs text-muted-fg">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21l6.75-6.75" />
                </svg>
                No logo — client will show their brand name as text in the nav
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
            <div className="rounded-md bg-success px-4 py-2.5 text-sm text-success-fg">
              Custom branding saved. Will apply on the client's next login.
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            {!hasCustom && globalTheme && (
              <button
                type="button"
                onClick={applyGlobalToForm}
                className="text-xs font-medium text-primary hover:underline"
              >
                Prefill from global theme
              </button>
            )}
            <Button type="submit" loading={saveMutation.isPending} className="ml-auto">
              Save custom branding
            </Button>
          </div>
        </div>
      </form>

      {/* ── Reset confirm dialog ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset to global theme"
        description="This will remove all custom branding for this client. They will inherit the platform-wide theme until new branding is saved."
        confirmLabel="Reset branding"
        variant="danger"
        loading={resetMutation.isPending}
        onConfirm={() => resetMutation.mutate()}
      />
    </div>
  )
}
