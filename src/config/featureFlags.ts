export interface FeatureFlagDef {
  key: string
  label: string
  description: string
  group: string
  defaultEnabled: boolean
}

export const FEATURE_FLAGS: FeatureFlagDef[] = [
  // ── Core modules ─────────────────────────────────────────────────────────
  {
    key: 'payments',
    label: 'Payments',
    description: 'Send, view and manage cross-border payments',
    group: 'Core',
    defaultEnabled: true,
  },
  {
    key: 'accounts',
    label: 'Accounts',
    description: 'Multi-currency account management and balances',
    group: 'Core',
    defaultEnabled: true,
  },
  {
    key: 'beneficiaries',
    label: 'Beneficiaries',
    description: 'Save and manage recipient bank accounts',
    group: 'Core',
    defaultEnabled: true,
  },
  {
    key: 'fx_rates',
    label: 'FX Rates',
    description: 'View live foreign exchange rates and corridors',
    group: 'Core',
    defaultEnabled: true,
  },
  // ── Payments workflow ─────────────────────────────────────────────────────
  {
    key: 'payment_approval',
    label: 'Maker-Checker Approval',
    description: 'Require a second user to approve payments before processing',
    group: 'Payments',
    defaultEnabled: true,
  },
  {
    key: 'payment_scheduling',
    label: 'Scheduled Payments',
    description: 'Schedule payments for a future date',
    group: 'Payments',
    defaultEnabled: false,
  },
  {
    key: 'bulk_payments',
    label: 'Bulk Payments',
    description: 'Upload and process multiple payments from a CSV file',
    group: 'Payments',
    defaultEnabled: false,
  },
  // ── Compliance ────────────────────────────────────────────────────────────
  {
    key: 'kyc',
    label: 'KYC Verification',
    description: 'Know Your Customer identity verification flow',
    group: 'Compliance',
    defaultEnabled: true,
  },
  {
    key: 'sanctions_screening',
    label: 'Sanctions Screening',
    description: 'Automatic beneficiary screening against sanctions lists',
    group: 'Compliance',
    defaultEnabled: true,
  },
  // ── Analytics & Reporting ─────────────────────────────────────────────────
  {
    key: 'reports',
    label: 'Reports',
    description: 'Transaction history reports with date filters and exports',
    group: 'Analytics',
    defaultEnabled: true,
  },
  {
    key: 'report_export',
    label: 'Report Exports',
    description: 'Download reports as CSV or PDF',
    group: 'Analytics',
    defaultEnabled: true,
  },
  // ── UX & Personalisation ──────────────────────────────────────────────────
  {
    key: 'notifications',
    label: 'In-app Notifications',
    description: 'Real-time alerts for payment status changes and system events',
    group: 'UX',
    defaultEnabled: true,
  },
  {
    key: 'dark_mode',
    label: 'Dark / Light Mode',
    description: 'Allow users to switch between light, dark, and system color modes',
    group: 'UX',
    defaultEnabled: true,
  },
  {
    key: 'sidebar_layout',
    label: 'Sidebar Layout',
    description: 'Allow users to switch to a sidebar navigation layout',
    group: 'UX',
    defaultEnabled: true,
  },
]

export const FLAG_GROUPS = [...new Set(FEATURE_FLAGS.map(f => f.group))]

export const DEFAULT_FLAGS: Record<string, boolean> = Object.fromEntries(
  FEATURE_FLAGS.map(f => [f.key, f.defaultEnabled])
)
