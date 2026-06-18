import { useState, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ContentCard } from '@/layouts/ContentCard'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Badge } from '@/components/ui/atoms/Badge'
import { FormField } from '@/components/ui/molecules/FormField'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { useProviderCredentials, useSetProviderCredentials, useTestProviderCredentials } from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/authStore'
import authApi from '@/api/auth'
import { cn } from '@/lib/utils'

// ─── Provider catalogue ───────────────────────────────────────────────────────

interface ProviderField {
  key: string
  label: string
  placeholder: string
  hint?: string
  sensitive?: boolean
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
        sensitive: true,
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
        sensitive: true,
      },
    ],
  },
]

const PROVIDER_MAP = Object.fromEntries(PROVIDER_DEFS.map(p => [p.name, p]))

// ─── Reveal rate-limit helpers (sessionStorage, per tenant) ──────────────────

const MAX_ATTEMPTS = 3
const LOCK_DURATION_MS = 15 * 60 * 1000

interface RevealLock { attempts: number; lockedUntil: number }

const lockKey = (tenantId: string) => `cred_reveal_${tenantId}`

function getRevealLock(tenantId: string): RevealLock {
  try {
    const raw = sessionStorage.getItem(lockKey(tenantId))
    if (raw) return JSON.parse(raw) as RevealLock
  } catch { /* ignore */ }
  return { attempts: 0, lockedUntil: 0 }
}

function saveRevealLock(tenantId: string, state: RevealLock) {
  sessionStorage.setItem(lockKey(tenantId), JSON.stringify(state))
}

function clearRevealLock(tenantId: string) {
  sessionStorage.removeItem(lockKey(tenantId))
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { tenantId: string }

export function TenantProviderCredentials({ tenantId }: Props) {
  const { data: creds, isLoading } = useProviderCredentials(tenantId)
  const setMutation  = useSetProviderCredentials()
  const testMutation = useTestProviderCredentials()
  const { user, tenantSlug } = useAuthStore()

  const [selectedProvider, setSelectedProvider] = useState('manual')
  const [fieldValues, setFieldValues]   = useState<Record<string, string>>({})
  const [saved, setSaved]               = useState(false)
  const [testResult, setTestResult]     = useState<{ success: boolean; message: string } | null>(null)

  // Tracks which sensitive fields are currently unmasked
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set())

  // Stores the values that came from the server (used for "has saved value" check)
  const serverValues = useRef<Record<string, string>>({})

  // ── Reveal dialog state ──
  const [showRevealDialog, setShowRevealDialog] = useState(false)
  const [pendingField, setPendingField]         = useState<string | null>(null)
  const [revealPassword, setRevealPassword]     = useState('')
  const [revealError, setRevealError]           = useState<string | null>(null)
  const [revealVerifying, setRevealVerifying]   = useState(false)

  // ── Rate-limit state (from sessionStorage) ──
  const [lockState, setLockState] = useState<RevealLock>(() => getRevealLock(tenantId))

  const isLocked = lockState.attempts >= MAX_ATTEMPTS && Date.now() < lockState.lockedUntil

  // Clear expired locks on mount
  useEffect(() => {
    const lock = getRevealLock(tenantId)
    if (lock.attempts >= MAX_ATTEMPTS && Date.now() >= lock.lockedUntil) {
      clearRevealLock(tenantId)
      setLockState({ attempts: 0, lockedUntil: 0 })
    }
  }, [tenantId])

  // Populate from loaded data
  useEffect(() => {
    if (creds) {
      setSelectedProvider(creds.provider_name ?? 'manual')
      const vals = Object.fromEntries(
        Object.entries(creds.config ?? {}).map(([k, v]) => [k, String(v ?? '')])
      )
      setFieldValues(vals)
      serverValues.current = vals
    }
  }, [creds])

  const handleProviderChange = (name: string) => {
    if (name !== selectedProvider) {
      setSelectedProvider(name)
      setFieldValues({})
      setRevealedFields(new Set())
      setTestResult(null)
      setSaved(false)
    }
  }

  const currentDef = PROVIDER_MAP[selectedProvider]

  const isDirty = (() => {
    if (!creds) return true
    if (selectedProvider !== creds.provider_name) return true
    const savedConfig = creds.config ?? {}
    return currentDef?.fields.some(
      f => (fieldValues[f.key] ?? '') !== String((savedConfig as Record<string, unknown>)[f.key] ?? '')
    )
  })()

  const handleSave = () => {
    setSaved(false)
    setTestResult(null)
    const config: Record<string, string> = {}
    currentDef?.fields.forEach(f => { if (fieldValues[f.key]) config[f.key] = fieldValues[f.key] })
    setMutation.mutate(
      { tenantId, providerName: selectedProvider, config },
      {
        onSuccess: () => {
          setSaved(true)
          // Re-mask all sensitive fields after save
          setRevealedFields(new Set())
          serverValues.current = { ...fieldValues }
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
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Connection test failed'
        setTestResult({ success: false, message: msg })
      },
    })
  }

  // ── Open reveal dialog for a field ──
  const openReveal = (fieldKey: string) => {
    const lock = getRevealLock(tenantId)
    // Re-check lock (timer may have expired)
    if (lock.attempts >= MAX_ATTEMPTS && Date.now() < lock.lockedUntil) {
      setLockState(lock)
      return
    }
    if (lock.attempts >= MAX_ATTEMPTS) {
      clearRevealLock(tenantId)
      setLockState({ attempts: 0, lockedUntil: 0 })
    }
    setPendingField(fieldKey)
    setRevealPassword('')
    setRevealError(null)
    setShowRevealDialog(true)
  }

  // ── Verify password and reveal ──
  const handleRevealSubmit = async () => {
    if (!user || !tenantSlug || !pendingField) return
    setRevealVerifying(true)
    setRevealError(null)
    try {
      await authApi.login({ email: user.email, password: revealPassword }, tenantSlug)
      // Success — reveal and reset lock
      setRevealedFields(prev => new Set([...prev, pendingField]))
      clearRevealLock(tenantId)
      setLockState({ attempts: 0, lockedUntil: 0 })
      setShowRevealDialog(false)
      setRevealPassword('')
      setPendingField(null)
    } catch {
      const current = getRevealLock(tenantId)
      const newAttempts = current.attempts + 1
      const newLock: RevealLock = {
        attempts: newAttempts,
        lockedUntil: newAttempts >= MAX_ATTEMPTS ? Date.now() + LOCK_DURATION_MS : 0,
      }
      saveRevealLock(tenantId, newLock)
      setLockState(newLock)
      setRevealPassword('')
      if (newAttempts >= MAX_ATTEMPTS) {
        setRevealError('Too many failed attempts. Access locked for 15 minutes.')
        setShowRevealDialog(false)
      } else {
        setRevealError(`Incorrect password. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? '' : 's'} remaining.`)
      }
    } finally {
      setRevealVerifying(false)
    }
  }

  const configured = !!creds && creds.provider_name !== 'manual'
  const canTest    = selectedProvider !== 'manual' && !isDirty

  if (isLoading) return <LoadingState message="Loading provider credentials…" />

  return (
    <>
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

          {/* ── Provider selector + fields ── */}
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

            {currentDef && currentDef.fields.length > 0 && (
              <div className="flex flex-col gap-3 flex-1">
                {currentDef.fields.map(field => {
                  const hasSavedValue = !!serverValues.current[field.key]
                  const isSensitive   = field.sensitive && hasSavedValue
                  const isRevealed    = revealedFields.has(field.key)

                  return (
                    <FormField key={field.key} label={field.label} htmlFor={`field-${field.key}`}>
                      <div className="relative flex items-center">
                        {isSensitive && !isRevealed ? (
                          /* Masked display — not editable until revealed */
                          <div className={cn(
                            'h-9 flex-1 rounded border bg-surface px-3 py-1 pr-9 text-sm font-mono',
                            'flex items-center tracking-widest text-muted-fg',
                            'border-border select-none',
                          )}>
                            {'•'.repeat(20)}
                          </div>
                        ) : (
                          <Input
                            id={`field-${field.key}`}
                            placeholder={field.placeholder}
                            value={fieldValues[field.key] ?? ''}
                            onChange={e => {
                              setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))
                              setSaved(false)
                              setTestResult(null)
                            }}
                            className={cn('font-mono text-sm pr-9', isSensitive && 'pr-9')}
                          />
                        )}

                        {/* Eye toggle button */}
                        {field.sensitive && hasSavedValue && (
                          <button
                            type="button"
                            onClick={() =>
                              isRevealed
                                ? setRevealedFields(prev => { const s = new Set(prev); s.delete(field.key); return s })
                                : openReveal(field.key)
                            }
                            disabled={!isRevealed && isLocked}
                            title={
                              isRevealed ? 'Hide value'
                                : isLocked ? 'Locked — too many failed attempts'
                                : 'Reveal value (requires password)'
                            }
                            className={cn(
                              'absolute right-2.5 text-muted-fg transition-colors',
                              'hover:text-foreground focus-visible:outline-none focus-visible:text-foreground',
                              'disabled:opacity-30 disabled:cursor-not-allowed',
                            )}
                          >
                            {isRevealed ? <EyeIcon /> : <EyeOffIcon />}
                          </button>
                        )}
                      </div>

                      {/* Lock warning */}
                      {field.sensitive && isLocked && (
                        <p className="text-xs text-danger-fg mt-1">
                          Locked after {MAX_ATTEMPTS} failed attempts. Try again in 15 minutes.
                        </p>
                      )}

                      {field.hint && !isLocked && (
                        <p className="text-xs text-muted-fg mt-1">{field.hint}</p>
                      )}
                    </FormField>
                  )
                })}
              </div>
            )}

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
                disabled={!canTest}
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

      {/* ── Reveal password dialog ── */}
      <Dialog.Root open={showRevealDialog} onOpenChange={(open) => {
        if (!open) { setShowRevealDialog(false); setRevealPassword(''); setRevealError(null) }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <Dialog.Title className="text-base font-semibold text-foreground">
              Confirm your password
            </Dialog.Title>
            <Dialog.Description className="mt-1.5 text-sm text-muted-fg">
              This credential is sensitive. Enter your login password to view it.
            </Dialog.Description>

            <div className="mt-4 flex flex-col gap-3">
              <FormField label="Password" htmlFor="revealPasswordInput">
                <Input
                  id="revealPasswordInput"
                  type="password"
                  placeholder="Your login password"
                  value={revealPassword}
                  onChange={e => { setRevealPassword(e.target.value); setRevealError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter' && revealPassword) handleRevealSubmit() }}
                  autoFocus
                />
              </FormField>

              {revealError && (
                <p className="text-xs text-danger-fg">{revealError}</p>
              )}

              {lockState.attempts > 0 && lockState.attempts < MAX_ATTEMPTS && (
                <p className="text-xs text-warning-fg">
                  {MAX_ATTEMPTS - lockState.attempts} attempt{MAX_ATTEMPTS - lockState.attempts === 1 ? '' : 's'} remaining before lockout.
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowRevealDialog(false); setRevealPassword(''); setRevealError(null) }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRevealSubmit}
                loading={revealVerifying}
                disabled={!revealPassword}
              >
                Reveal
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
