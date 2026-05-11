import { PaymentCorridorMap } from '@/components/PaymentCorridorMap'
import { PageHeader } from '@/components/ui/organisms/PageHeader'

export function CorridorMap() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payment Network"
        description="Live corridor visualisation — real-time settlement flows across 15 routes and 16 countries."
      />
      <PaymentCorridorMap />
    </div>
  )
}
