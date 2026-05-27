import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button, Input, FormField } from "@/components/ui/index";
import { useAuthStore } from "@/stores/authStore";
import authApi from "@/api/auth";
import kycApi from "@/api/kyc";
import { getApiError } from "@/lib/apiError";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "invite" | "public";

interface WizardData {
  companyName: string;
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getPasswordStrength = (pwd: string): number => {
  let score = 0;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};

const STRENGTH_META = [
  { label: "", color: "bg-border" },
  { label: "Weak", color: "bg-danger-fg" },
  { label: "Fair", color: "bg-warning" },
  { label: "Good", color: "bg-warning" },
  { label: "Strong", color: "bg-success-fg" },
  { label: "Strong", color: "bg-success-fg" },
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all",
                  done
                    ? "bg-primary border-primary text-white"
                    : active
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-transparent border-border text-muted-fg",
                )}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap hidden sm:block",
                  active ? "text-primary" : done ? "text-foreground" : "text-muted-fg",
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-2 mb-4 transition-all", i < current ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Left hero panel ──────────────────────────────────────────────────────────

const HERO_CONTENT = {
  company: {
    icon: (
      <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
    title: "Create your workspace",
    subtitle: `Your team's hub for global payments and compliance.`,
    items: [
      "Multi-currency accounts in 50+ currencies",
      "Live FX rates with transparent pricing",
      "Maker-checker payment approvals",
      "Full audit trail and reconciliation",
    ],
  },
  personal: {
    icon: (
      <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
    title: "A bit about you",
    subtitle: "Help us personalise your experience from day one.",
    items: [
      "Your data is end-to-end encrypted",
      "GDPR and SOC 2 compliant",
      "Never shared with third parties",
      "You control what you share",
    ],
  },
  password: {
    icon: (
      <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
    title: "Lock it down",
    subtitle: "A strong password keeps your finances safe.",
    items: [
      "RS256 JWT — bank-grade encryption",
      "Optional TOTP two-factor authentication",
      "Session auto-expires after inactivity",
      "IP-based anomaly detection",
    ],
  },
  documents: {
    icon: (
      <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2"
        />
      </svg>
    ),
    title: "Verify your identity",
    subtitle: "Required by global financial regulations to process payments.",
    items: [
      "Takes less than 2 minutes",
      "Accepted: Passport, National ID, Driving licence",
      "Proof of address dated within 3 months",
      "Documents reviewed within 1 business day",
    ],
  },
  review: {
    icon: (
      <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    title: "Almost there",
    subtitle: "Review your details before we create your account.",
    items: [
      "Check your name and contact info",
      "Your workspace URL cannot be changed later",
      "Store your password somewhere safe",
      "Everything else can be updated in Settings",
    ],
  },
  complete: {
    icon: (
      <svg className="w-8 h-8 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
    ),
    title: "You're all set!",
    subtitle: "Your account is ready. Here's what to do next.",
    items: [
      "Add a beneficiary to receive payments",
      "Send your first cross-border payment",
      "Invite your team members",
      "Set up maker-checker approvals",
    ],
  },
};

function HeroPanel({ stepKey }: { stepKey: keyof typeof HERO_CONTENT }) {
  const content = HERO_CONTENT[stepKey];
  return (
    <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col bg-gradient-to-br from-[#060c1f] via-[#0d1635] to-[#060c1f]">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Ambient glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-indigo-600/15 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[20%] -right-12 w-56 h-56 rounded-full bg-violet-600/15 blur-[70px] pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 p-10">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">RemitX</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-12 pb-16">
        {/* Icon bubble */}
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8">
          {content.icon}
        </div>

        <h2 className="text-3xl font-bold text-white leading-tight mb-3">{content.title}</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-xs">{content.subtitle}</p>

        <div className="flex flex-col gap-3.5">
          {content.items.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom badge */}
      <div className="relative z-10 px-12 pb-10">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Bank-grade encryption · SOC 2 compliant · GDPR ready
        </div>
      </div>
    </div>
  );
}

// ─── Step: Company (public mode only) ────────────────────────────────────────

const companySchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  slug: z
    .string()
    .min(3, "Minimum 3 characters")
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
});

function StepCompany({
  onNext,
  defaults,
}: {
  onNext: (data: Pick<WizardData, "companyName" | "slug">) => void;
  defaults?: Pick<WizardData, "companyName" | "slug">;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: { companyName: defaults?.companyName ?? "", slug: defaults?.slug ?? "" },
  });

  const companyName = watch("companyName", "");
  const slug = watch("slug", "");

  // Auto-generate slug from company name only when slug hasn't been saved yet
  useEffect(() => {
    if (companyName && !defaults?.slug) setValue("slug", toSlug(companyName), { shouldValidate: false });
  }, [companyName, defaults?.slug, setValue]);

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <FormField label="Company name" error={errors.companyName?.message} htmlFor="companyName">
        <Input
          id="companyName"
          placeholder="Acme Corporation"
          autoFocus
          {...register("companyName")}
          error={!!errors.companyName}
        />
      </FormField>

      <FormField
        label="Workspace slug"
        error={errors.slug?.message}
        htmlFor="slug"
        hint="This becomes your workspace URL and cannot be changed later"
      >
        <div className="relative">
          <Input id="slug" placeholder="acme-corp" {...register("slug")} error={!!errors.slug} className="pr-0" />
        </div>
        {slug && !errors.slug && (
          <p className="mt-1.5 text-xs text-muted-fg font-mono">
            app.remitx.io/<span className="text-primary font-semibold">{slug}</span>
          </p>
        )}
      </FormField>

      <Button type="submit" variant="gradient" className="w-full h-11 mt-2 font-semibold">
        Continue
        <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </form>
  );
}

// ─── Step: Personal info ──────────────────────────────────────────────────────

const personalSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

function StepPersonal({
  mode,
  defaultEmail,
  defaults,
  onNext,
  onBack,
}: {
  mode: Mode;
  defaultEmail?: string;
  defaults?: Pick<WizardData, "firstName" | "lastName" | "email" | "phone">;
  onNext: (data: Pick<WizardData, "firstName" | "lastName" | "email" | "phone">) => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof personalSchema>>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      firstName: defaults?.firstName ?? "",
      lastName:  defaults?.lastName  ?? "",
      email:     defaults?.email     ?? defaultEmail ?? "",
      phone:     defaults?.phone     ?? "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit((d) => onNext({ ...d, email: d.email ?? "", phone: d.phone ?? "" }))}
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField label="First name" error={errors.firstName?.message} htmlFor="firstName">
          <Input id="firstName" placeholder="Jane" autoFocus {...register("firstName")} error={!!errors.firstName} />
        </FormField>
        <FormField label="Last name" error={errors.lastName?.message} htmlFor="lastName">
          <Input id="lastName" placeholder="Smith" {...register("lastName")} error={!!errors.lastName} />
        </FormField>
      </div>

      {mode === "public" && (
        <FormField label="Work email" error={errors.email?.message} htmlFor="email">
          <Input
            id="email"
            type="email"
            placeholder="jane@acmecorp.com"
            {...register("email")}
            error={!!errors.email}
          />
        </FormField>
      )}

      {mode === "invite" && defaultEmail && (
        <div>
          <p className="text-xs font-medium text-muted-fg mb-1.5">Email</p>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-raised border border-border text-sm text-foreground">
            <svg className="w-4 h-4 text-muted-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            {defaultEmail}
          </div>
        </div>
      )}

      <FormField label="Phone number" htmlFor="phone" hint="Optional — used for account recovery">
        <Input id="phone" type="tel" placeholder="+1 555 000 0000" {...register("phone")} />
      </FormField>

      <div className="flex gap-3 mt-2">
        <Button type="button" variant="outline" className="flex-1 h-11" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" variant="gradient" className="flex-1 h-11 font-semibold">
          Continue
          <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </form>
  );
}

// ─── Step: Password ───────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Minimum 12 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number")
      .regex(/[^A-Za-z0-9]/, "Include a special character"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

// ─── Password generator ───────────────────────────────────────────────────────

const UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER   = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS  = '0123456789'
const SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const ALL     = UPPER + LOWER + DIGITS + SPECIAL

function generateStrongPassword(): string {
  // Guarantee at least 2 of every required character class, then fill to 16
  const pool = [
    UPPER[Math.floor(Math.random() * UPPER.length)],
    UPPER[Math.floor(Math.random() * UPPER.length)],
    LOWER[Math.floor(Math.random() * LOWER.length)],
    LOWER[Math.floor(Math.random() * LOWER.length)],
    DIGITS[Math.floor(Math.random() * DIGITS.length)],
    DIGITS[Math.floor(Math.random() * DIGITS.length)],
    SPECIAL[Math.floor(Math.random() * SPECIAL.length)],
    SPECIAL[Math.floor(Math.random() * SPECIAL.length)],
  ]
  while (pool.length < 16) pool.push(ALL[Math.floor(Math.random() * ALL.length)])
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.join('')
}

// ─────────────────────────────────────────────────────────────────────────────

function StepPassword({
  onNext,
  onBack,
}: {
  onNext: (password: string) => void;
  onBack: () => void;
}) {
  const [show, setShow] = useState(false);
  const [generatedPwd, setGeneratedPwd] = useState('');
  const [copied, setCopied] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  const pwd = watch("password", "");
  const strength = getPasswordStrength(pwd);
  const meta = STRENGTH_META[strength];

  const handleGenerate = () => {
    const newPwd = generateStrongPassword()
    setGeneratedPwd(newPwd)
    setCopied(false)
    setShow(true)
    setValue('password', newPwd, { shouldValidate: true })
    setValue('confirm',  newPwd, { shouldValidate: true })
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPwd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const requirements = [
    { label: "At least 12 characters", met: pwd.length >= 12 },
    { label: "Uppercase letter", met: /[A-Z]/.test(pwd) },
    { label: "Lowercase letter", met: /[a-z]/.test(pwd) },
    { label: "Number", met: /[0-9]/.test(pwd) },
    { label: "Special character", met: /[^A-Za-z0-9]/.test(pwd) },
  ];

  return (
    <form onSubmit={handleSubmit((d) => onNext(d.password))} className="flex flex-col gap-5">

      {/* Generate password button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Choose a password</p>
        <button
          type="button"
          onClick={handleGenerate}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Generate strong password
        </button>
      </div>

      {/* Save-it banner — shown only when a password was generated */}
      {generatedPwd && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
          <div className="flex items-start gap-2.5 mb-3">
            <svg className="w-4 h-4 text-warning mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-warning">Save this password now</p>
              <p className="text-xs text-muted-fg mt-0.5">Store it in a password manager. You won't be able to see it again.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-surface rounded-lg border border-border px-3 py-2.5">
            <code className="flex-1 text-sm font-mono text-foreground tracking-wide select-all break-all">
              {generatedPwd}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                'shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all',
                copied
                  ? 'bg-success-fg/15 text-success-fg'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <FormField label="Password" error={errors.password?.message} htmlFor="pw">
        <div className="relative">
          <Input
            id="pw"
            type={show ? "text" : "password"}
            placeholder="••••••••••••"
            autoFocus
            {...register("password")}
            error={!!errors.password}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-foreground"
          >
            {show ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Strength meter */}
        {pwd.length > 0 && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn("flex-1 h-1 rounded-full transition-all", strength >= i + 1 ? meta.color : "bg-border")}
                />
              ))}
            </div>
            {strength > 0 && (
              <p
                className={cn(
                  "text-xs font-medium",
                  strength <= 2 ? "text-danger-fg" : strength <= 3 ? "text-warning" : "text-success-fg",
                )}
              >
                {meta.label}
              </p>
            )}
          </div>
        )}
      </FormField>

      {/* Requirements checklist */}
      {pwd.length > 0 && (
        <div className="rounded-lg bg-surface-raised border border-border p-3.5 flex flex-col gap-2">
          {requirements.map((req) => (
            <div key={req.label} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                  req.met ? "bg-success-fg/15" : "bg-border",
                )}
              >
                {req.met && (
                  <svg className="w-2.5 h-2.5 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={cn("text-xs", req.met ? "text-foreground" : "text-muted-fg")}>{req.label}</span>
            </div>
          ))}
        </div>
      )}

      <FormField label="Confirm password" error={errors.confirm?.message} htmlFor="cpw">
        <Input
          id="cpw"
          type={show ? "text" : "password"}
          placeholder="••••••••••••"
          {...register("confirm")}
          error={!!errors.confirm}
        />
      </FormField>

      <div className="flex gap-3 mt-1">
        <Button type="button" variant="outline" className="flex-1 h-11" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" variant="gradient" className="flex-1 h-11 font-semibold">
          Review & confirm
          <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </form>
  );
}

// ─── Step: Review ────────────────────────────────────────────────────────────

function ReviewCard({
  title,
  onEdit,
  rows,
}: {
  title: string;
  onEdit: () => void;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-raised border-b border-border">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4">
            <span className="text-xs text-muted-fg shrink-0">{row.label}</span>
            <span className="text-xs text-foreground font-medium text-right break-all">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepReview({
  mode,
  wizardData,
  onConfirm,
  onEdit,
  loading,
  error,
}: {
  mode: Mode;
  wizardData: Partial<WizardData>;
  onConfirm: () => void;
  onEdit: (key: keyof typeof HERO_CONTENT) => void;
  loading: boolean;
  error: string;
}) {
  const fullName = [wizardData.firstName, wizardData.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="flex flex-col gap-3">
      {/* Company card — public mode only */}
      {mode === "public" && (
        <ReviewCard
          title="Workspace"
          onEdit={() => onEdit("company")}
          rows={[
            { label: "Company name", value: wizardData.companyName || "—" },
            { label: "Workspace URL", value: wizardData.slug ? `app.remitx.io/${wizardData.slug}` : "—" },
          ]}
        />
      )}

      {/* Personal info */}
      <ReviewCard
        title="Your info"
        onEdit={() => onEdit("personal")}
        rows={[
          { label: "Full name", value: fullName },
          { label: "Email", value: wizardData.email || "—" },
          { label: "Phone", value: wizardData.phone || "—" },
        ]}
      />

      {/* Password */}
      <ReviewCard
        title="Password"
        onEdit={() => onEdit("password")}
        rows={[{ label: "Status", value: "✓ Set" }]}
      />

      {/* Terms note */}
      <p className="text-xs text-muted-fg text-center px-2 leading-relaxed">
        By confirming you agree to RemitX's{" "}
        <a href="#" className="text-primary hover:underline">Terms of Service</a>{" "}
        and{" "}
        <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
      </p>

      {/* Server error */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg bg-danger border border-danger-border px-3.5 py-3">
          <svg className="h-4 w-4 text-danger-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-danger-fg">{error}</p>
        </div>
      )}

      <Button
        variant="gradient"
        className="w-full h-11 font-semibold mt-1"
        loading={loading}
        onClick={onConfirm}
      >
        {loading ? "Creating your account…" : "Confirm & create account"}
      </Button>
    </div>
  );
}

// ─── Step: Documents (KYC) ────────────────────────────────────────────────────

type DocState = {
  file: File | null;
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

const ID_TYPES = [
  { id: "passport", label: "Passport", hint: "Photo / bio-data page" },
  { id: "national_id", label: "National ID", hint: "Front and back" },
  { id: "driving_license", label: "Driver's licence", hint: "Front and back" },
];

function DocZone({
  label,
  hint,
  accept = ".jpg,.jpeg,.png,.pdf",
  state,
  onFile,
  onRemove,
}: {
  label: string;
  hint: string;
  accept?: string;
  state: DocState;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  if (state.file && state.status !== "idle") {
    return (
      <div
        className={cn(
          "rounded-xl border-2 p-4 flex items-center gap-3 transition-all",
          state.status === "done"
            ? "border-success-fg/40 bg-success-fg/5"
            : state.status === "error"
              ? "border-danger-fg/40 bg-danger/5"
              : "border-border bg-surface-raised",
        )}
      >
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            state.status === "done" ? "bg-success-fg/15" : state.status === "error" ? "bg-danger/20" : "bg-primary/10",
          )}
        >
          {state.status === "done" ? (
            <svg className="w-5 h-5 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : state.status === "uploading" ? (
            <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-danger-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{state.file.name}</p>
          {state.status === "uploading" && (
            <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${state.progress}%` }} />
            </div>
          )}
          {state.status === "error" && <p className="text-xs text-danger-fg mt-0.5">{state.error}</p>}
          {state.status === "done" && <p className="text-xs text-success-fg mt-0.5">Uploaded successfully</p>}
        </div>
        {state.status !== "uploading" && (
          <button type="button" onClick={onRemove} className="text-muted-fg hover:text-foreground p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <label className="group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 p-6 cursor-pointer transition-all">
      <input
        type="file"
        className="sr-only"
        accept={accept}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-fg mt-0.5">{hint}</p>
        <p className="text-xs text-muted-fg mt-1">JPG, PNG or PDF · max 10 MB</p>
      </div>
    </label>
  );
}

function StepDocuments({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [idType, setIdType] = useState("passport");
  const [idDoc, setIdDoc] = useState<DocState>({ file: null, status: "idle", progress: 0 });
  const [addrDoc, setAddrDoc] = useState<DocState>({ file: null, status: "idle", progress: 0 });
  const [initiated, setInitiated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File, type: string, setState: React.Dispatch<React.SetStateAction<DocState>>) => {
    setState((s) => ({ ...s, status: "uploading", progress: 0 }));
    try {
      await kycApi.uploadDocument(file, type, (pct) => setState((s) => ({ ...s, progress: pct })));
      setState((s) => ({ ...s, status: "done", progress: 100 }));
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: getApiError(err, "Upload failed") }));
    }
  };

  const handleIdFile = async (file: File) => {
    setIdDoc({ file, status: "uploading", progress: 0 });
    if (!initiated) {
      try {
        await kycApi.initiate();
        setInitiated(true);
      } catch {
        /* already exists */ setInitiated(true);
      }
    }
    await upload(file, idType, setIdDoc);
  };

  const handleAddrFile = async (file: File) => {
    setAddrDoc({ file, status: "uploading", progress: 0 });
    if (!initiated) {
      try {
        await kycApi.initiate();
        setInitiated(true);
      } catch {
        setInitiated(true);
      }
    }
    await upload(file, "proof_of_address", setAddrDoc);
  };

  const canContinue = idDoc.status === "done" && addrDoc.status === "done";

  return (
    <div className="flex flex-col gap-5">
      {/* ID type selector */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Government-issued ID</p>
        <div className="flex gap-2 mb-3">
          {ID_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setIdType(t.id)}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                idType === t.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-fg hover:border-primary/40",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <DocZone
          label={`Upload ${ID_TYPES.find((t) => t.id === idType)?.label}`}
          hint={ID_TYPES.find((t) => t.id === idType)?.hint ?? ""}
          state={idDoc}
          onFile={handleIdFile}
          onRemove={() => setIdDoc({ file: null, status: "idle", progress: 0 })}
        />
      </div>

      {/* Address proof */}
      <div>
        <p className="text-sm font-medium text-foreground mb-1">Proof of address</p>
        <p className="text-xs text-muted-fg mb-2">Utility bill or bank statement dated within 3 months</p>
        <DocZone
          label="Upload proof of address"
          hint="Utility bill, bank statement, official letter"
          state={addrDoc}
          onFile={handleAddrFile}
          onRemove={() => setAddrDoc({ file: null, status: "idle", progress: 0 })}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-lg bg-danger border border-danger-border px-3.5 py-3">
          <p className="text-sm text-danger-fg">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-2.5 mt-1">
        <Button
          type="button"
          variant="gradient"
          className="w-full h-11 font-semibold"
          disabled={!canContinue || submitting}
          onClick={onNext}
        >
          Continue to dashboard
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-fg hover:text-foreground text-center py-1 transition-colors"
        >
          Skip for now — I'll verify later
        </button>
      </div>
    </div>
  );
}

// ─── Step: Complete ───────────────────────────────────────────────────────────

function StepComplete({ name }: { name: string }) {
  const navigate = useNavigate();

  const NEXT_STEPS = [
    { label: "Add a beneficiary", href: "/beneficiaries/new", icon: "👤" },
    { label: "Send your first payment", href: "/payments/new", icon: "💸" },
    { label: "Invite your team", href: "/settings/users", icon: "🤝" },
  ];

  return (
    <div className="flex flex-col items-center text-center gap-6">
      {/* Celebration icon */}
      <div className="w-20 h-20 rounded-full bg-success-fg/10 border-2 border-success-fg/30 flex items-center justify-center">
        <svg className="w-10 h-10 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-foreground">Welcome, {name}!</h3>
        <p className="text-muted-fg text-sm mt-1.5 max-w-xs mx-auto">
          Your RemitX account is ready. Here are a few things to get you started.
        </p>
      </div>

      {/* Quick-start actions */}
      <div className="w-full flex flex-col gap-2">
        {NEXT_STEPS.map((s) => (
          <Link
            key={s.href}
            to={s.href}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface-raised hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
          >
            <span className="text-xl">{s.icon}</span>
            <span className="flex-1 text-sm font-medium text-foreground">{s.label}</span>
            <svg
              className="w-4 h-4 text-muted-fg group-hover:text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      <Button variant="gradient" className="w-full h-11 font-semibold mt-1" onClick={() => navigate("/dashboard")}>
        Go to dashboard
      </Button>
    </div>
  );
}

// ─── Main: Onboard ────────────────────────────────────────────────────────────

export function Onboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const inviteToken = searchParams.get("token") ?? "";
  const inviteTenant = searchParams.get("tenant") ?? "";
  const mode: Mode = inviteToken ? "invite" : "public";

  // Invite mode: pre-fetch the invited user's email to display it
  const [inviteeEmail] = useState<string>("");

  // Accumulated wizard data
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({});
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingPassword, setPendingPassword] = useState("");

  const STEPS: Array<{ key: keyof typeof HERO_CONTENT; label: string }> =
    mode === "invite"
      ? [
          { key: "personal", label: "Your info" },
          { key: "password", label: "Password" },
          { key: "review", label: "Review" },
          { key: "documents", label: "Identity" },
          { key: "complete", label: "Done" },
        ]
      : [
          { key: "company", label: "Workspace" },
          { key: "personal", label: "Your info" },
          { key: "password", label: "Password" },
          { key: "review", label: "Review" },
          { key: "documents", label: "Identity" },
          { key: "complete", label: "Done" },
        ];

  const currentKey = STEPS[step].key;

  const handleCompany = (data: Pick<WizardData, "companyName" | "slug">) => {
    setWizardData((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  };

  const handlePersonal = (data: Pick<WizardData, "firstName" | "lastName" | "email" | "phone">) => {
    setWizardData((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  };

  const handlePassword = (password: string) => {
    setPendingPassword(password);
    setStep((s) => s + 1);
  };

  const handleConfirm = async () => {
    setSubmitError("");
    setSubmitting(true);
    try {
      if (mode === "invite") {
        const { data: res } = await authApi.inviteAccept(
          inviteToken,
          pendingPassword,
          wizardData.firstName!,
          wizardData.lastName!,
          wizardData.phone,
        );
        setAuth(res.data.user, res.data.accessToken, res.data.refreshToken, inviteTenant);
      } else {
        const { data: res } = await authApi.register({
          slug: wizardData.slug!,
          companyName: wizardData.companyName!,
          email: wizardData.email!,
          password: pendingPassword,
          firstName: wizardData.firstName!,
          lastName: wizardData.lastName!,
          phone: wizardData.phone,
        });
        setAuth(res.data.user, res.data.accessToken, res.data.refreshToken, res.data.tenant.slug);
      }
      setStep((s) => s + 1);
    } catch (err) {
      setSubmitError(getApiError(err, "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocumentsDone = () => setStep((s) => s + 1);
  const handleDocumentsSkip = () => setStep((s) => s + 1);

  return (
    <div className="min-h-screen flex">
      {/* Left hero */}
      <HeroPanel stepKey={currentKey} />

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-surface p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <span className="font-bold text-xl text-foreground">RemitX</span>
          </div>

          {/* Step indicator — hidden on complete step */}
          {currentKey !== "complete" && <StepIndicator steps={STEPS.map((s) => s.label)} current={step} />}

          {/* Step header */}
          {currentKey !== "complete" && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {currentKey === "company" && "Create your workspace"}
                {currentKey === "personal" && "What's your name?"}
                {currentKey === "password" && "Set your password"}
                {currentKey === "review" && "Review your details"}
                {currentKey === "documents" && "Verify your identity"}
              </h2>
              <p className="mt-1 text-sm text-muted-fg">
                {currentKey === "company" && "Choose a name and URL for your team."}
                {currentKey === "personal" && "This is how your team will see you."}
                {currentKey === "password" && "Must be at least 12 characters with mixed characters."}
                {currentKey === "review" && "Make sure everything looks correct before we create your account."}
                {currentKey === "documents" && "Upload your ID and a proof of address. Takes under 2 minutes."}
              </p>
            </div>
          )}

          {/* Step content */}
          {currentKey === "company" && (
            <StepCompany
              onNext={handleCompany}
              defaults={wizardData as Pick<WizardData, "companyName" | "slug">}
            />
          )}
          {currentKey === "personal" && (
            <StepPersonal
              mode={mode}
              defaultEmail={inviteeEmail || undefined}
              defaults={wizardData as Pick<WizardData, "firstName" | "lastName" | "email" | "phone">}
              onNext={handlePersonal}
              onBack={() => setStep((s) => s - 1)}
            />
          )}
          {currentKey === "password" && (
            <StepPassword
              onNext={handlePassword}
              onBack={() => setStep((s) => s - 1)}
            />
          )}
          {currentKey === "review" && (
            <StepReview
              mode={mode}
              wizardData={wizardData}
              onConfirm={handleConfirm}
              onEdit={(key) => {
                const idx = STEPS.findIndex((s) => s.key === key);
                if (idx >= 0) setStep(idx);
              }}
              loading={submitting}
              error={submitError}
            />
          )}
          {currentKey === "documents" && <StepDocuments onNext={handleDocumentsDone} onSkip={handleDocumentsSkip} />}
          {currentKey === "complete" && <StepComplete name={wizardData.firstName ?? "there"} />}

          {/* Footer */}
          {currentKey !== "complete" && (
            <p className="mt-8 text-center text-xs text-muted-fg/60">
              {mode === "invite" ? (
                <span>
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </span>
              ) : (
                <span>Invited by a colleague? Check your email for a direct invite link.</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
