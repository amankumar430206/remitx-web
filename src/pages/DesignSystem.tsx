import { useState } from 'react'
import { PageHeader, Divider } from '@/components/ui/index'
import { ContentCard } from '@/layouts/ContentCard'
import {
  Button, Badge, Input, Select, Textarea, Checkbox, Toggle, Avatar, Spinner,
  FormField, SearchInput, CurrencyInput, AmountDisplay, StatusBadge,
  EmptyState, ErrorState, LoadingState, ConfirmDialog,
  DataTable, FilterBar, StatCard, Timeline, FileUpload, PermissionMatrix,
} from '@/components/ui/index'

// Local import to avoid circular — PageHeader is also in organisms
// Re-export alias used in page

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{title}</h2>
      {children}
    </section>
  )
}

export function DesignSystem() {
  const [checked, setChecked] = useState(false)
  const [toggled, setToggled] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const currencies = [
    { value: 'USD', label: 'USD' },
    { value: 'GBP', label: 'GBP' },
    { value: 'EUR', label: 'EUR' },
    { value: 'INR', label: 'INR' },
  ]

  const tableData = [
    { id: '1', name: 'Alice Johnson', amount: '5,000.00', currency: 'USD', status: 'completed' },
    { id: '2', name: 'Bob Smith',     amount: '12,000.00', currency: 'GBP', status: 'pending_approval' },
    { id: '3', name: 'Carol Lee',     amount: '800.00',   currency: 'EUR', status: 'failed' },
  ]

  const timelineEvents = [
    { id: '1', status: 'pending_approval', label: 'Submitted for approval', actor: 'Alice Johnson', timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
    { id: '2', status: 'processing', label: 'Approved', actor: 'Bob Smith', timestamp: new Date(Date.now() - 3600000).toISOString(), note: 'Looks good, approved.' },
    { id: '3', status: 'completed', label: 'Payment completed', actor: 'System', timestamp: new Date().toISOString() },
  ]

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 flex flex-col gap-12">
      <PageHeader
        title="Design System"
        description="All RemitX UI components in one place."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Design System' }]}
      />

      {/* Atoms */}
      <Section title="Atoms — Buttons">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Atoms — Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Section title="Atoms — Inputs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <FormField label="Text input" htmlFor="text-eg">
            <Input id="text-eg" placeholder="Enter text…" />
          </FormField>
          <FormField label="Error state" error="This field is required" htmlFor="err-eg">
            <Input id="err-eg" error placeholder="Enter text…" />
          </FormField>
          <FormField label="Textarea" htmlFor="ta-eg">
            <Textarea id="ta-eg" placeholder="Enter description…" />
          </FormField>
          <FormField label="Select" htmlFor="sel-eg">
            <Select options={currencies} placeholder="Select currency" />
          </FormField>
        </div>
      </Section>

      <Section title="Atoms — Controls">
        <div className="flex flex-wrap gap-6 items-center">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={checked} onCheckedChange={v => setChecked(v === true)} />
            Checkbox
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Toggle checked={toggled} onCheckedChange={setToggled} />
            Toggle {toggled ? 'on' : 'off'}
          </label>
          <Avatar fallback="AJ" size="sm" />
          <Avatar fallback="BK" size="md" />
          <Avatar fallback="CL" size="lg" />
          <Spinner size="sm" />
          <Spinner size="md" />
        </div>
      </Section>

      <Divider label="Molecules" />

      <Section title="Molecules — Inputs">
        <div className="flex flex-col gap-4 max-w-lg">
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} placeholder="Search payments…" />
          <CurrencyInput currencies={currencies} currency="USD" amount="1000" />
          <div className="flex gap-4 flex-wrap">
            <AmountDisplay amount={12500.5} currency="USD" size="xl" />
            <AmountDisplay amount={500} currency="GBP" size="lg" positive />
            <AmountDisplay amount={200} currency="EUR" size="md" negative />
          </div>
        </div>
      </Section>

      <Section title="Molecules — Status Badges">
        <div className="flex flex-wrap gap-2">
          {['pending_approval','pending_compliance','processing','completed','failed','rejected','cancelled','approved','submitted','blocked','active','invited'].map(s => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Molecules — States">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ContentCard padding="none">
            <EmptyState title="No payments yet" description="Send your first payment to get started." action={{ label: 'Send payment', onClick: () => {} }} />
          </ContentCard>
          <ContentCard padding="none">
            <ErrorState title="Failed to load" description="Could not fetch payments." onRetry={() => {}} />
          </ContentCard>
          <ContentCard padding="none">
            <LoadingState message="Fetching payments…" />
          </ContentCard>
        </div>
      </Section>

      <Section title="Molecules — Confirm Dialog">
        <Button onClick={() => setConfirmOpen(true)}>Open Confirm Dialog</Button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Approve payment?"
          description="This will debit USD 12,500 from your account. This action cannot be undone."
          confirmLabel="Approve"
          onConfirm={() => setConfirmOpen(false)}
        />
      </Section>

      <Divider label="Organisms" />

      <Section title="Organisms — Stat Cards">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total sent" value="$128,450" description="This month" trend={{ value: 12.5 }} />
          <StatCard title="Pending approvals" value="8" description="Requires action" trend={{ value: -3 }} />
          <StatCard title="Accounts" value="4" description="Active" />
          <StatCard title="Avg. processing" value="2.4h" loading={false} />
        </div>
      </Section>

      <Section title="Organisms — Filter Bar + Data Table">
        <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search…" hasActiveFilters={!!search} onReset={() => setSearch('')} />
        <DataTable
          columns={[
            { key: 'name', header: 'Recipient', sortable: true },
            { key: 'amount', header: 'Amount', render: row => <AmountDisplay amount={row.amount.replace(',', '')} currency={row.currency} /> },
            { key: 'status', header: 'Status', render: row => <StatusBadge status={row.status} /> },
          ]}
          data={tableData.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))}
          getRowId={r => r.id}
          selectable
        />
      </Section>

      <Section title="Organisms — Timeline">
        <ContentCard>
          <Timeline events={timelineEvents} />
        </ContentCard>
      </Section>

      <Section title="Organisms — File Upload">
        <FileUpload
          accept=".pdf,.jpg,.png"
          multiple
          onFilesSelected={files => console.log(files)}
          uploadedFiles={[
            { name: 'passport.jpg', size: 524288, status: 'success' },
            { name: 'utility_bill.pdf', size: 1048576, status: 'uploading', progress: 60 },
          ]}
        />
      </Section>

      <Section title="Organisms — Permission Matrix">
        <PermissionMatrix
          roles={['maker', 'checker', 'client_admin']}
          permissions={[
            { key: 'payments:create', label: 'Create payments', group: 'Payments' },
            { key: 'payments:approve', label: 'Approve payments', group: 'Payments' },
            { key: 'payments:view_all', label: 'View all payments', group: 'Payments' },
            { key: 'accounts:view', label: 'View accounts', group: 'Accounts' },
            { key: 'accounts:create', label: 'Create accounts', group: 'Accounts' },
            { key: 'reports:export', label: 'Export reports', group: 'Reports' },
          ]}
          value={{
            maker: ['payments:create', 'accounts:view'],
            checker: ['payments:approve', 'payments:view_all', 'accounts:view', 'reports:export'],
            client_admin: ['payments:create', 'payments:approve', 'payments:view_all', 'accounts:view', 'accounts:create', 'reports:export'],
          }}
        />
      </Section>
    </div>
  )
}
