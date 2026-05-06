import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { FormField } from '@/components/ui/molecules/FormField'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { ContentCard } from '@/layouts/ContentCard'
import { useThemeStore } from '@/stores/themeStore'
import { ThemeToggle } from '@/components/ui/atoms/ThemeToggle'
import { useLayoutStore, type LayoutMode } from '@/stores/layoutStore'
import { cn } from '@/lib/utils'

const schema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color'),
  fontFamily: z.string().min(1, 'Font family is required'),
  tenantName: z.string().min(1, 'Name is required'),
})

type FormValues = z.infer<typeof schema>

const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'DM Sans, sans-serif', label: 'DM Sans' },
  { value: 'Geist, sans-serif', label: 'Geist' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
]

const LAYOUT_OPTIONS: { value: LayoutMode; label: string; description: string; preview: React.ReactNode }[] = [
  {
    value: 'topnav',
    label: 'Top navigation',
    description: 'Classic horizontal bar across the top',
    preview: (
      <div className="w-full h-16 rounded-lg border border-border overflow-hidden bg-surface-raised flex flex-col gap-1 p-1.5">
        <div className="h-3 w-full rounded bg-muted-fg/20" />
        <div className="flex gap-1 flex-1">
          <div className="flex-1 rounded bg-muted" />
        </div>
      </div>
    ),
  },
  {
    value: 'sidebar',
    label: 'Sidebar navigation',
    description: 'Vertical sidebar pinned to the left',
    preview: (
      <div className="w-full h-16 rounded-lg border border-border overflow-hidden bg-surface-raised flex gap-1 p-1.5">
        <div className="w-5 h-full rounded bg-muted-fg/20" />
        <div className="flex-1 rounded bg-muted" />
      </div>
    ),
  },
]

export function Theme() {
  const theme = useThemeStore(s => s.theme)
  const applyTheme = useThemeStore(s => s.applyTheme)
  const layout = useLayoutStore(s => s.layout)
  const setLayout = useLayoutStore(s => s.setLayout)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      primaryColor: '#2563eb',
      secondaryColor: '#7c3aed',
      fontFamily: 'Inter, sans-serif',
      tenantName: '',
    },
  })

  useEffect(() => {
    if (theme) {
      reset({
        primaryColor: theme.primaryColor ?? '#2563eb',
        secondaryColor: theme.secondaryColor ?? '#7c3aed',
        fontFamily: theme.fontFamily ?? 'Inter, sans-serif',
        tenantName: theme.tenantName ?? '',
      })
    }
  }, [theme, reset])

  const primaryColor = watch('primaryColor')
  const secondaryColor = watch('secondaryColor')

  const handlePreview = () => {
    const values = { primaryColor, secondaryColor, fontFamily: watch('fontFamily'), tenantName: watch('tenantName'), logoUrl: theme?.logoUrl }
    applyTheme(values)
  }

  const onSave = async (values: FormValues) => {
    setSaving(true)
    applyTheme({ ...values, logoUrl: theme?.logoUrl })
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader title="Theme" breadcrumbs={[{ label: 'Settings' }, { label: 'Theme' }]} />

      <ContentCard>
        <div className="flex flex-col gap-3 pb-5 mb-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Color mode</h3>
          <p className="text-xs text-muted-fg">Choose how the interface appears to you.</p>
          <ThemeToggle variant="segmented" />
        </div>

        <div className="flex flex-col gap-3 pb-5 mb-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Navigation layout</h3>
          <p className="text-xs text-muted-fg">Choose where the navigation lives.</p>
          <div className="grid grid-cols-2 gap-3">
            {LAYOUT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLayout(opt.value)}
                className={cn(
                  'flex flex-col gap-2.5 rounded-xl border-2 p-3 text-left transition-all duration-150',
                  layout === opt.value
                    ? 'border-primary bg-primary-subtle'
                    : 'border-border hover:border-border-strong bg-surface-raised'
                )}
              >
                {opt.preview}
                <div>
                  <p className={cn('text-xs font-semibold', layout === opt.value ? 'text-primary' : 'text-foreground')}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-muted-fg mt-0.5">{opt.description}</p>
                </div>
                {layout === opt.value && (
                  <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSave)}>
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Brand settings</h3>

            <FormField label="Tenant / brand name" error={errors.tenantName?.message} required htmlFor="tenantName">
              <Input id="tenantName" {...register('tenantName')} />
            </FormField>

            <FormField label="Font family" error={errors.fontFamily?.message} required>
              <Select
                value={watch('fontFamily')}
                onValueChange={v => setValue('fontFamily', v)}
                options={FONT_OPTIONS}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Primary colour" error={errors.primaryColor?.message} required htmlFor="primaryColor">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setValue('primaryColor', e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-border"
                  />
                  <Input
                    id="primaryColor"
                    {...register('primaryColor')}
                    className="font-mono uppercase w-32"
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
                    className="h-9 w-12 cursor-pointer rounded border border-border"
                  />
                  <Input
                    id="secondaryColor"
                    {...register('secondaryColor')}
                    className="font-mono uppercase w-32"
                    maxLength={7}
                    error={!!errors.secondaryColor}
                  />
                </div>
              </FormField>
            </div>

            {/* Live preview swatches */}
            <div className="flex items-center gap-3 pt-1">
              <div
                className="h-8 w-24 rounded flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Primary
              </div>
              <div
                className="h-8 w-24 rounded flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: secondaryColor }}
              >
                Secondary
              </div>
            </div>

            {saved && (
              <div className="rounded-md bg-success px-4 py-2 text-sm text-success-fg">
                Theme saved and applied.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handlePreview}>
                Preview
              </Button>
              <Button type="submit" loading={saving}>Save theme</Button>
            </div>
          </div>
        </form>
      </ContentCard>
    </div>
  )
}
