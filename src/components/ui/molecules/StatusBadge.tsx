import { Badge } from '@/components/ui/atoms/Badge'
import type { BadgeProps } from '@/components/ui/atoms/Badge'

type Status =
  | 'pending_approval' | 'pending_compliance' | 'pending_manual_processing'
  | 'processing' | 'completed' | 'failed' | 'rejected' | 'cancelled'
  | 'active' | 'inactive' | 'invited' | 'suspended'
  | 'approved' | 'submitted' | 'under_review' | 'expired'
  | 'clear' | 'blocked' | 'pending'

const STATUS_MAP: Record<Status, { label: string; variant: BadgeProps['variant'] }> = {
  pending_approval:           { label: 'Pending Approval',  variant: 'warning' },
  pending_compliance:         { label: 'Compliance Review', variant: 'warning' },
  pending_manual_processing:  { label: 'Manual Processing', variant: 'warning' },
  processing:                 { label: 'Processing',        variant: 'primary' },
  completed:                  { label: 'Completed',         variant: 'success' },
  failed:                     { label: 'Failed',            variant: 'danger' },
  rejected:                   { label: 'Rejected',          variant: 'danger' },
  cancelled:                  { label: 'Cancelled',         variant: 'default' },
  active:                     { label: 'Active',            variant: 'success' },
  inactive:                   { label: 'Inactive',          variant: 'default' },
  invited:                    { label: 'Invited',           variant: 'primary' },
  suspended:                  { label: 'Suspended',         variant: 'danger' },
  approved:                   { label: 'Approved',          variant: 'success' },
  submitted:                  { label: 'Submitted',         variant: 'primary' },
  under_review:               { label: 'Under Review',      variant: 'warning' },
  expired:                    { label: 'Expired',           variant: 'danger' },
  clear:                      { label: 'Cleared',           variant: 'success' },
  blocked:                    { label: 'Blocked',           variant: 'danger' },
  pending:                    { label: 'Pending',           variant: 'warning' },
}

export interface StatusBadgeProps {
  status: Status | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status as Status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>
}
