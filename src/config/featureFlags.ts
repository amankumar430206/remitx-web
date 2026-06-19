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
  {
    key: 'network',
    label: 'Network',
    description: 'Network overview and connectivity page',
    group: 'Core',
    defaultEnabled: true,
  },
  {
    key: 'ai_assistant',
    label: 'AI Assistant',
    description: 'In-app AI assistant for payment guidance and support',
    group: 'Core',
    defaultEnabled: true,
  },
  // ── Payments workflow ─────────────────────────────────────────────────────
  {
    key: 'fx_pay_now',
    label: 'FX Pay Now',
    description: 'Enable "Pay now" button on FX Rates page that creates a locked Zoqq quote and redirects to payment form',
    group: 'Payments',
    defaultEnabled: true,
  },
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
  // ── Fees & Billing ────────────────────────────────────────────────────────
  {
    key: 'account_activation_fee',
    label: 'Account Activation Fee',
    description: 'Charge a one-time fee when a new user account is activated',
    group: 'Fees & Billing',
    defaultEnabled: false,
  },
  {
    key: 'iban_creation_fee',
    label: 'IBAN Creation Fee',
    description: 'Charge a fee each time a currency IBAN / wallet account is created',
    group: 'Fees & Billing',
    defaultEnabled: false,
  },
  {
    key: 'transaction_send_fee',
    label: 'Transaction Send Fees',
    description: 'Apply per-transaction fees on outbound payments',
    group: 'Fees & Billing',
    defaultEnabled: true,
  },
  {
    key: 'transaction_receive_fee',
    label: 'Transaction Receive Fees',
    description: 'Apply per-transaction fees on inbound payments',
    group: 'Fees & Billing',
    defaultEnabled: false,
  },
  {
    key: 'monthly_maintenance_fee',
    label: 'Monthly Maintenance Fee',
    description: 'Apply a recurring monthly charge per currency account',
    group: 'Fees & Billing',
    defaultEnabled: false,
  },
  {
    key: 'amc_fee',
    label: 'Annual Maintenance Charge (AMC)',
    description: 'Apply an annual maintenance charge at the tenant level',
    group: 'Fees & Billing',
    defaultEnabled: false,
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
  {
    key: 'back_to_top',
    label: 'Back to Top Button',
    description: 'Show a floating button that scrolls back to the top of any page',
    group: 'UX',
    defaultEnabled: true,
  },
  {
    key: 'client_branding',
    label: 'Client Branding',
    description: 'Show tenant logo and name in the sidebar/nav header instead of the default RemitX branding',
    group: 'UX',
    defaultEnabled: true,
  },
  {
    key: 'dashboard_notifications',
    label: 'Dashboard Notifications Panel',
    description: 'Show a recent notifications panel on the right side of the Dashboard',
    group: 'UX',
    defaultEnabled: true,
  },
]

export const FLAG_GROUPS = [...new Set(FEATURE_FLAGS.map(f => f.group))]

export const DEFAULT_FLAGS: Record<string, boolean> = Object.fromEntries(
  FEATURE_FLAGS.map(f => [f.key, f.defaultEnabled])
)
