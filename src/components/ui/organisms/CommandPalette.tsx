import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'
import { usePermissions } from '@/hooks/usePermissions'
import { SEARCH_REGISTRY, CATEGORY_META, type SearchItem } from '@/config/searchRegistry'

// ─── Guide content ────────────────────────────────────────────────────────────

interface GuideSection { heading: string; body: string }
interface Guide { title: string; sections: GuideSection[] }

const GUIDES: Record<string, Guide> = {
  'provider-resolution': {
    title: 'Provider resolution order',
    sections: [
      { heading: '1. Exact corridor match (tenant)', body: 'A rule for this tenant with the exact source AND destination currency — e.g. USD → GBP.' },
      { heading: '2. Wildcard destination (tenant)', body: 'A rule for this tenant matching the source currency with destination blank — "any destination from this source", e.g. USD → Any.' },
      { heading: '3. Any-to-any (tenant)', body: 'A rule for this tenant with both source and destination blank. Acts as a catch-all for all currency pairs.' },
      { heading: '4. Tenant default provider', body: 'The default provider configured on the client. Applied when no corridor rule matches.' },
      { heading: '5–7. Global platform corridors', body: 'The same three-step lookup (exact → wildcard dest → any-to-any) is repeated against the platform-wide global corridor rules.' },
      { heading: '8. Manual fallback', body: 'If nothing matches, the payment enters the manual processing queue for the ops team to handle.' },
      { heading: 'Priority field', body: 'When multiple rules at the same level could match, the one with the lowest priority number wins. Default priority is 1.' },
    ],
  },
  'maker-checker': {
    title: 'Maker-checker workflow',
    sections: [
      { heading: 'What it is', body: 'Every payment must be initiated by a Maker and approved by a separate Checker before it is dispatched. This is enforced at both the database and application level — it cannot be bypassed.' },
      { heading: 'Maker', body: 'Creates the payment with recipient, amount, currency, and reference. The payment enters PENDING_APPROVAL status.' },
      { heading: 'Checker', body: 'Reviews and approves or rejects the payment. A Checker cannot approve their own payments (self-approval is blocked by a DB constraint).' },
      { heading: 'Approval thresholds', body: 'Auto-approved ≤ $1k · Single checker ≤ $50k · Dual checker > $50k. Thresholds are configurable per tenant.' },
      { heading: 'After approval', body: 'The payment is dispatched to the configured provider. Status moves through: PENDING_APPROVAL → APPROVED → PROCESSING → COMPLETED (or FAILED).' },
      { heading: 'Rejection', body: 'A Checker can reject with a reason. The Maker is notified. A rejected payment cannot be re-submitted — a new payment must be created.' },
    ],
  },
  'fx-quote': {
    title: 'FX quote & rate lock',
    sections: [
      { heading: 'What is a quote?', body: 'Before submitting a payment, the system locks an exchange rate for 15 minutes. This guarantees the rate shown is the rate applied — protecting against market movement during the approval window.' },
      { heading: 'Quote TTL', body: 'Quotes expire after 15 minutes. If the payment is not approved before expiry, a new quote must be fetched.' },
      { heading: 'Quote ID', body: 'The quote ID is attached to the payment and sent to the provider at dispatch time. The provider uses it to honour the locked rate.' },
      { heading: 'No quote = live rate', body: 'If a payment is dispatched without a valid quote (e.g. quote expired), the provider may apply a live market rate at dispatch time. Always approve within the quote window.' },
      { heading: 'Live rates vs quotes', body: 'The FX Rates page shows indicative live rates for reference. A quote is a firm commitment locked at a point in time — these differ by provider spread.' },
    ],
  },
  'kyc': {
    title: 'KYC / KYB process',
    sections: [
      { heading: 'Statuses', body: 'pending → submitted → approved (or rejected). An approved status expires after 2 years and must be renewed.' },
      { heading: 'What is required', body: 'Company registration documents + director ID (KYB). Individual passport or national ID + proof of address (KYC). Exact requirements depend on your jurisdiction.' },
      { heading: 'Submission', body: 'Upload documents via Settings → KYC / Verify. The ops team reviews and approves or rejects with a reason.' },
      { heading: 'Payment gate', body: 'Payments cannot be submitted if KYC status is pending, rejected, or expired. The kycGuard middleware enforces this on every payment API call.' },
      { heading: 'Expiry', body: 'KYC approval expires after 2 years. You will be notified 30 days before expiry. Submit renewed documents before expiry to avoid payment disruption.' },
    ],
  },
  'fees': {
    title: 'Fee categories',
    sections: [
      { heading: 'account_activation', body: 'Charged once when a user account is first activated on the platform.' },
      { heading: 'iban_creation', body: 'Charged when a new currency account (wallet/IBAN) is opened.' },
      { heading: 'transaction_send', body: 'Applied on each outbound payment. Can be flat or percentage, optionally corridor-specific (USD → GBP).' },
      { heading: 'transaction_receive', body: 'Applied when an inbound payment is received into an account.' },
      { heading: 'monthly_maintenance', body: 'Recurring monthly charge per currency account.' },
      { heading: 'amc', body: 'Annual maintenance charge — tenant-wide, not per-currency.' },
      { heading: 'Resolution order', body: 'Most specific wins: tenant exact corridor → tenant wildcard → tenant global (null currency) → global exact → global wildcard → global null. If no rule is found, no fee is charged.' },
    ],
  },
  'roles': {
    title: 'Roles & permission model',
    sections: [
      { heading: 'Built-in roles', body: 'super_admin · client_admin · maker · checker · subclient_admin · subclient_user. System roles (client_admin, user) are read-only.' },
      { heading: 'super_admin', body: 'Full platform access. Manages all tenants, providers, global fees, KYC queue, and all payments. Has the * wildcard permission.' },
      { heading: 'client_admin', body: 'Manages their own organisation — users, theme, sub-clients, fee view, and settings. Cannot approve payments.' },
      { heading: 'maker', body: 'Creates and submits payments. Cannot approve their own payments.' },
      { heading: 'checker', body: 'Approves or rejects payments submitted by makers. Cannot approve their own submissions.' },
      { heading: 'Custom roles', body: 'Go to Settings → Roles & Permissions to create custom roles with a specific set of permissions. Custom roles can be assigned during user invite or via role-change.' },
      { heading: 'Permission format', body: 'Permissions are domain:action strings — e.g. payments:create, accounts:view, admin:config. A domain wildcard (payments:*) grants all actions in that domain.' },
    ],
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matches(item: SearchItem, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    item.title.toLowerCase().includes(q) ||
    item.subtitle.toLowerCase().includes(q) ||
    item.keywords.some(k => k.toLowerCase().includes(q))
  )
}

function CategoryIcon({ category }: { category: SearchItem['category'] }) {
  if (category === 'action') return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
  if (category === 'setting') return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
  if (category === 'admin') return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  )
  if (category === 'guide') return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
  // page
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

// ─── Guide sub-view ───────────────────────────────────────────────────────────

function GuideView({ guideId, onBack }: { guideId: string; onBack: () => void }) {
  const guide = GUIDES[guideId]
  if (!guide) return null
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-fg hover:text-foreground transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span className="text-muted-fg/40">·</span>
        <span className="text-xs font-medium text-foreground">{guide.title}</span>
      </div>
      <div className="overflow-y-auto max-h-[420px] p-4 flex flex-col gap-4">
        {guide.sections.map((s, i) => (
          <div key={i}>
            <p className="text-xs font-semibold text-foreground mb-1">{s.heading}</p>
            <p className="text-xs text-muted-fg leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const { open, setOpen } = useCommandPaletteStore()
  const navigate = useNavigate()
  const { has } = usePermissions()

  const [query, setQuery]           = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [guideId, setGuideId]       = useState<string | null>(null)

  const inputRef   = useRef<HTMLInputElement>(null)
  const listRef    = useRef<HTMLDivElement>(null)
  const itemRefs   = useRef<(HTMLButtonElement | null)[]>([])

  // Filter registry by permissions + query
  const filteredItems = useMemo(() => {
    return SEARCH_REGISTRY.filter(item => {
      if (item.requiredPermissions && !item.requiredPermissions.some(p => has(p))) return false
      return matches(item, query)
    })
  }, [query, has])

  // Group by category, sorted by category order
  const grouped = useMemo(() => {
    const map = new Map<string, SearchItem[]>()
    for (const item of filteredItems) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return [...map.entries()].sort(
      ([a], [b]) => CATEGORY_META[a as SearchItem['category']].order - CATEGORY_META[b as SearchItem['category']].order
    )
  }, [filteredItems])

  // Flat ordered list for keyboard nav
  const flatItems = useMemo(() => grouped.flatMap(([, items]) => items), [grouped])

  const reset = useCallback(() => {
    setQuery('')
    setActiveIndex(0)
    setGuideId(null)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    reset()
  }, [setOpen, reset])

  const selectItem = useCallback((item: SearchItem) => {
    if (item.guideId) {
      setGuideId(item.guideId)
      return
    }
    if (item.path) {
      navigate(item.path)
      handleClose()
    }
  }, [navigate, handleClose])

  // Reset index when filtered list changes
  useEffect(() => { setActiveIndex(0) }, [filteredItems.length])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      reset()
    }
  }, [open, reset])

  // Scroll active item into view
  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (guideId) {
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); setGuideId(null) }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flatItems[activeIndex]) {
      e.preventDefault()
      selectItem(flatItems[activeIndex])
    }
  }

  let flatIndex = 0

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          onKeyDown={handleKeyDown}
          className={cn(
            'fixed left-1/2 top-[12vh] z-50 -translate-x-1/2 w-full max-w-xl',
            'rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <Dialog.Title className="sr-only">Platform search</Dialog.Title>
          <Dialog.Description className="sr-only">Search pages, actions, settings, and guides</Dialog.Description>

          {guideId ? (
            <GuideView guideId={guideId} onBack={() => setGuideId(null)} />
          ) : (
            <>
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <svg className="h-4 w-4 shrink-0 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search pages, actions, guides…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-fg focus:outline-none"
                />
                {query && (
                  <button onClick={() => { setQuery(''); inputRef.current?.focus() }} className="text-muted-fg hover:text-foreground transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Results */}
              <div ref={listRef} className="overflow-y-auto max-h-[420px]">
                {flatItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <p className="text-sm font-medium text-foreground">No results for "{query}"</p>
                    <p className="text-xs text-muted-fg mt-1">Try a different keyword — page name, action, or topic.</p>
                  </div>
                ) : (
                  grouped.map(([category, items]) => (
                    <div key={category}>
                      <div className="px-4 pt-3 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">
                          {CATEGORY_META[category as SearchItem['category']].label}
                        </span>
                      </div>
                      {items.map(item => {
                        const idx = flatIndex++
                        const isActive = idx === activeIndex
                        return (
                          <button
                            key={item.id}
                            ref={el => { itemRefs.current[idx] = el }}
                            onClick={() => selectItem(item)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              isActive ? 'bg-surface-overlay' : 'hover:bg-surface-overlay/50',
                            )}
                          >
                            <span className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                              isActive ? 'border-border-strong text-foreground bg-surface-raised' : 'border-border text-muted-fg bg-surface',
                            )}>
                              <CategoryIcon category={item.category} />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium text-foreground truncate">{item.title}</span>
                              <span className="block text-xs text-muted-fg truncate">{item.subtitle}</span>
                            </span>
                            {item.guideId ? (
                              <span className="shrink-0 text-[10px] font-medium text-muted-fg bg-surface border border-border rounded px-1.5 py-0.5">guide</span>
                            ) : (
                              isActive && (
                                <span className="shrink-0 text-[10px] text-muted-fg">
                                  <kbd className="font-sans bg-surface border border-border rounded px-1.5 py-0.5">↵</kbd>
                                </span>
                              )
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-2.5 text-[11px] text-muted-fg">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="font-sans bg-surface-raised border border-border rounded px-1 py-0.5">↑</kbd>
                    <kbd className="font-sans bg-surface-raised border border-border rounded px-1 py-0.5">↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="font-sans bg-surface-raised border border-border rounded px-1 py-0.5">↵</kbd>
                    open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="font-sans bg-surface-raised border border-border rounded px-1 py-0.5">Esc</kbd>
                    close
                  </span>
                </div>
                <span>{flatItems.length} result{flatItems.length !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
