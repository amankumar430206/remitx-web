import { useState, useEffect } from 'react'
import { ContentCard } from '@/layouts/ContentCard'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Badge } from '@/components/ui/atoms/Badge'
import { FormField } from '@/components/ui/molecules/FormField'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { useProviderCredentials, useSetProviderCredentials, useTestProviderCredentials } from '@/hooks/useAdmin'
import { cn } from '@/lib/utils'

// ─── Provider catalogue ───────────────────────────────────────────────────────
// Each provider declares which per-tenant config fields it needs.
// Add a new entry here when a new provider is integrated.

interface ProviderField {
  key: string
  label: string
  placeholder: string
  hint?: string
}

interface ProviderDef {
  name: string
  label: string
  fields: ProviderField[]
}

const PROVIDER_DEFS: ProviderDef[] = [
  {
    name: 'manual',
    label: 'Manual',
    fields: [],
  },
  {
    name: 'zoqq',
    label: 'Zoqq',
    fields: [
      {
        key: 'user_id',
        label: 'User ID',
        placeholder: 'acct_xxxxxxxxxxxxxxxx',
        hint: 'Assigned by Zoqq when this client is onboarded to the Zoqq platform.',
      },
    ],
  },
  {
    name: 'cloudcurrency',
    label: 'Cloud Currency',
    fields: [
      {
        key: 'user_id',
        label: 'User ID',
        placeholder: 'client_xxxxxxxx',
        hint: 'Per-tenant account identifier assigned by Cloud Currency.',
      },
    ],
  },
]

const PROVIDER_MAP = Object.fromEntries(PROVIDER_DEFS.map(p => [p.name, p]))

interface Props {
  tenantId: string
}

export function TenantProviderCredentials({ tenantId }: Props) {
  const { data: creds, isLoading } = useProviderCredentials(tenantId)
  const setMutation = useSetProviderCredentials()
  const testMutation = useTestProviderCredentials()

  const [selectedProvider, setSelectedProvider] = useState('manual')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Populate from loaded data
  useEffect(() => {
    if (creds) {
      setSelectedProvider(creds.provider_name ?? 'manual')
      setFieldValues(
        Object.fromEntries(
          Object.entries(creds.config ?? {}).map(([k, v]) => [k, String(v ?? '')])
        )
      )
    }
  }, [creds])

  // Reset fields when provider changes (don't carry over another provider's values)
  const handleProviderChange = (name: string) => {
    if (name !== selectedProvider) {
      setSelectedProvider(name)
      setFieldValues({})
      setTestResult(null)
      setSaved(false)
    }
  }

  const currentDef = PROVIDER_MAP[selectedProvider]

  const isDirty = (() => {
    if (!creds) return true
    if (selectedProvider !== creds.provider_name) return true
    const savedConfig = creds.config ?? {}
    return currentDef?.fields.some(f => (fieldValues[f.key] ?? '') !== String(savedConfig[f.key as keyof typeof savedConfig] ?? ''))
  })()

  const handleSave = () => {
    setSaved(false)
    setTestResult(null)
    const config: Record<string, string> = {}
    currentDef?.fields.forEach(f => {
      if (fieldValues[f.key]) config[f.key] = fieldValues[f.key]
    })
    setMutation.mutate(
      { tenantId, providerName: selectedProvider, config },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2500)
        },
      },
    )
  }

  const handleTest = () => {
    setTestResult(null)
    testMutation.mutate(tenantId, {
      onSuccess: (result) => {
        setTestResult(
          result.success
            ? { success: true, message: `Connected — provider user ID: ${result.providerUserId ?? '—'}` }
            : { success: false, message: result.error ?? 'Connection failed' },
        )
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Connection test failed'
        setTestResult({ success: false, message: msg })
      },
    })
  }

  const configured = !!creds && creds.provider_name !== 'manual'
  const canTest = selectedProvider !== 'manual' && !isDirty

  if (isLoading) return <LoadingState message="Loading provider credentials…" />

  return (
    <ContentCard>
      <div className="flex flex-col gap-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Provider credentials</h3>
            <p className="text-xs text-muted-fg mt-0.5 max-w-md">
              Per-tenant account identifier for the payment provider. Platform-level credentials
              (API keys, secrets) are managed in server environment variables.
            </p>
          </div>
          {creds && (
            <Badge variant={configured ? 'success' : 'default'} className="shrink-0">
              {configured ? `${creds.provider_name} configured` : 'manual / not set'}
            </Badge>
          )}
        </div>

        {/* ── Provider selector ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="w-full sm:w-48 shrink-0">
            <FormField label="Provider" htmlFor="providerSelect">
              <select
                id="providerSelect"
                value={selectedProvider}
                onChange={e => handleProviderChange(e.target.value)}
                className={cn(
                  'h-9 w-full rounded border bg-surface px-3 py-1 text-sm text-foreground shadow-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  'border-border hover:border-border-strong',
                )}
              >
                {PROVIDER_DEFS.map(p => (
                  <option key={p.name} value={p.name}>{p.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          {/* ── Provider-specific fields ── */}
          {currentDef && currentDef.fields.length > 0 && (
            <div className="flex flex-col gap-3 flex-1">
              {currentDef.fields.map(field => (
                <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`}>
                  <Input
                    id={`field-${field.key}`}
                    placeholder={field.placeholder}
                    value={fieldValues[field.key] ?? ''}
                    onChange={e => {
                      setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))
                      setSaved(false)
                      setTestResult(null)
                    }}
                    className="font-mono text-sm"
                  />
                  {field.hint && (
                    <p className="text-xs text-muted-fg mt-1">{field.hint}</p>
                  )}
                </FormField>
              ))}
            </div>
          )}

          {/* Manual provider — no extra fields */}
          {currentDef && currentDef.fields.length === 0 && (
            <div className="flex items-center mt-6">
              <p className="text-xs text-muted-fg">
                No additional credentials required for the manual provider.
              </p>
            </div>
          )}
        </div>

        {/* ── Test result ── */}
        {testResult && (
          <div className={cn(
            'rounded-md border px-3 py-2.5 text-xs',
            testResult.success
              ? 'border-success/30 bg-success/5 text-success-fg'
              : 'border-danger-fg/30 bg-danger/5 text-danger-fg',
          )}>
            <span className="font-medium mr-1">{testResult.success ? '✓' : '✕'}</span>
            {testResult.message}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            loading={setMutation.isPending}
            disabled={!isDirty}
          >
            {saved ? '✓ Saved' : 'Save credentials'}
          </Button>

          {selectedProvider !== 'manual' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              loading={testMutation.isPending}
              disabled={canTest === false}
              title={isDirty ? 'Save credentials before testing' : undefined}
            >
              Test connection
            </Button>
          )}

          {isDirty && selectedProvider !== 'manual' && (
            <span className="text-xs text-muted-fg">Save first to test connection</span>
          )}
        </div>

      </div>
    </ContentCard>
  )
}
