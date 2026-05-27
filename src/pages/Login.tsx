import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input, FormField } from '@/components/ui/index'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'

// ─── Dev quick-login (only rendered in development) ──────────────────────────
const DEV_USERS = [
  { label: 'Super Admin', role: 'super_admin', email: 'admin@remitx.com',   password: 'Admin@RemitX2024!', tenant: 'remitx', color: 'primary' },
  { label: 'Maker',       role: 'maker',       email: 'maker1@remitx.com',  password: 'Test@1234!',        tenant: 'remitx', color: 'success' },
  { label: 'Checker',     role: 'checker',     email: 'checker1@remitx.com',password: 'Test@1234!',        tenant: 'remitx', color: 'warning' },
  { label: 'Client Admin',role: 'client_admin',email: 'cadmin@remitx.com',  password: 'Test@1234!',        tenant: 'remitx', color: 'info'    },
] as const

const CHIP_COLORS: Record<string, { border: string; text: string; activeBg: string; activeText: string }> = {
  primary: { border: 'border-primary',  text: 'text-primary',  activeBg: 'bg-primary/15',  activeText: 'text-primary' },
  success: { border: 'border-success',  text: 'text-success',  activeBg: 'bg-success/15',  activeText: 'text-success' },
  warning: { border: 'border-warning',  text: 'text-warning',  activeBg: 'bg-warning/15',  activeText: 'text-warning' },
  info:    { border: 'border-info',     text: 'text-info',     activeBg: 'bg-info/15',      activeText: 'text-info'    },
}
// ─────────────────────────────────────────────────────────────────────────────

const schema = z.object({
  tenantSlug: z.string().min(1, 'Workspace is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

const ArrowsIcon = () => (
  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
)

const CheckIcon = () => (
  <svg className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
)

const FEATURES = [
  '50+ supported currencies with live FX rates',
  'Built-in KYC & compliance screening',
  'Maker-checker approval workflows',
  'Full audit trail & reconciliation reports',
]

const STATS = [
  { value: '$2B+', label: 'Processed' },
  { value: '50+', label: 'Currencies' },
  { value: '99.9%', label: 'Uptime' },
]

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const tenantSlug = useAuthStore(s => s.tenantSlug)
  const [serverError, setServerError] = useState('')

  const [activeDevRole, setActiveDevRole] = useState<string | null>(null)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tenantSlug: tenantSlug ?? 'remitx' },
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

  // Dev quick-login: fill form + immediately submit — single click to authenticate
  const loginAs = (u: typeof DEV_USERS[number]) => {
    setActiveDevRole(u.role)
    onSubmit({ tenantSlug: u.tenant, email: u.email, password: u.password })
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left hero panel ───────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[58%] hero-gradient relative overflow-hidden flex-col">

        {/* Grid pattern */}
        <div className="absolute inset-0 hero-grid pointer-events-none" />

        {/* Ambient glows */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-600/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[15%] -right-16 h-72 w-72 rounded-full bg-violet-600/20 blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl btn-gradient flex items-center justify-center shadow-lg shadow-blue-900/40">
              <ArrowsIcon />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">RemitX</span>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12 pb-8">
          <p className="text-blue-400 text-xs font-semibold mb-4 tracking-widest uppercase">
            Cross-border payments platform
          </p>
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] mb-5">
            Move money<br />
            <span className="text-gradient-brand">globally, instantly.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-md">
            The all-in-one platform trusted by modern businesses for international payments, FX management, and compliance.
          </p>

          {/* Feature list */}
          <div className="flex flex-col gap-3.5 mb-12">
            {FEATURES.map(f => (
              <div key={f} className="flex items-start gap-3">
                <div className="mt-0.5 h-5 w-5 rounded-full bg-blue-500/15 border border-blue-500/35 flex items-center justify-center flex-shrink-0">
                  <CheckIcon />
                </div>
                <span className="text-slate-300 text-sm leading-relaxed">{f}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-10 pt-6 border-t border-white/[0.07]">
            {STATS.map(s => (
              <div key={s.label}>
                <div className="text-xl font-bold text-white tabular">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating payment card */}
        <div className="absolute bottom-10 right-8 w-60 glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs text-slate-400 flex-1">Payment completed</span>
            <span className="text-[10px] text-emerald-400 font-medium">Just now</span>
          </div>
          <div className="text-xl font-bold text-white tabular mb-0.5">$12,500.00</div>
          <div className="text-xs text-slate-500">USD → GBP · John Smith</div>
          <div className="mt-4 h-1 rounded-full bg-white/[0.07] overflow-hidden">
            <div className="h-full w-full bar-gradient rounded-full" />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-slate-600">Processing</span>
            <span className="text-[10px] text-emerald-400">100%</span>
          </div>
        </div>

        {/* Second floating card */}
        <div className="absolute top-[28%] right-10 w-44 glass-card px-4 py-3 rounded-xl">
          <div className="text-[10px] text-slate-500 mb-1">Live rate</div>
          <div className="text-sm font-bold text-white tabular">1 USD = 0.789 GBP</div>
          <div className="flex items-center gap-1 mt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-emerald-400">Updated 2s ago</span>
          </div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-surface p-8 lg:p-12">
        <div className="w-full max-w-[360px]">

          {/* Mobile-only logo */}
          <div className="lg:hidden mb-8 flex items-center justify-center gap-2.5">
            <div className="h-9 w-9 rounded-xl btn-gradient flex items-center justify-center">
              <ArrowsIcon />
            </div>
            <span className="font-bold text-xl text-foreground">RemitX</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-fg">Sign in to your workspace to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <FormField label="Workspace" error={errors.tenantSlug?.message} htmlFor="slug">
              <Input id="slug" placeholder="your-company" {...register('tenantSlug')} error={!!errors.tenantSlug} />
            </FormField>
            <FormField label="Email address" error={errors.email?.message} htmlFor="email">
              <Input id="email" type="email" placeholder="you@company.com" {...register('email')} error={!!errors.email} />
            </FormField>
            <FormField label="Password" error={errors.password?.message} htmlFor="password">
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} error={!!errors.password} />
            </FormField>

            {serverError && (
              <div className="flex items-center gap-2.5 rounded-lg bg-danger border border-danger-border px-3.5 py-3">
                <svg className="h-4 w-4 text-danger-fg flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-danger-fg">{serverError}</p>
              </div>
            )}

            <Button variant="gradient" type="submit" loading={isSubmitting} className="w-full h-11 text-sm font-semibold mt-1">
              Sign in to workspace
            </Button>

            <p className="text-center text-sm text-muted-fg">
              <Link to="/password-reset" className="text-primary hover:underline font-medium">
                Forgot your password?
              </Link>
            </p>
          </form>

          <p className="mt-10 text-center text-xs text-muted-fg/60">
            Protected by bank-grade encryption · SOC 2 compliant
          </p>

          {/* ── Dev quick-login panel ── */}
          {import.meta.env.DEV && (
            <div className="mt-6 rounded-xl border border-dashed border-warning/50 bg-warning/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-widest bg-warning text-black uppercase">
                  DEV
                </span>
                <span className="text-xs font-semibold text-warning">Quick login</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEV_USERS.map(u => {
                  const c = CHIP_COLORS[u.color]
                  const active = activeDevRole === u.role
                  return (
                    <button
                      key={u.role}
                      type="button"
                      onClick={() => loginAs(u)}
                      className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${c.border} ${active ? `${c.activeBg}` : 'bg-transparent hover:bg-surface'}`}
                    >
                      <span className={`text-xs font-semibold ${active ? c.activeText : 'text-foreground'}`}>
                        {u.label}
                      </span>
                      <span className={`text-[10px] mt-0.5 ${active ? `${c.text} opacity-80` : 'text-muted-fg'}`}>
                        {u.email}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-raised px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-xl btn-gradient flex items-center justify-center shadow-lg">
              <ArrowsIcon />
            </div>
            <span className="text-xl font-bold text-foreground">RemitX</span>
          </div>
          <p className="text-sm text-muted-fg">{title}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-7 card-shadow-md">
          {children}
        </div>
      </div>
    </div>
  )
}
