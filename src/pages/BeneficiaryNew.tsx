import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { useCreateBeneficiary } from '@/hooks/useBeneficiaries'
import { BeneficiaryForm } from './BeneficiaryForm'

export function BeneficiaryNew() {
  const navigate = useNavigate()
  const createMutation = useCreateBeneficiary()

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <PageHeader
        title="Add beneficiary"
        breadcrumbs={[{ label: 'Beneficiaries', href: '/beneficiaries' }, { label: 'New' }]}
      />
      <BeneficiaryForm
        submitLabel="Add beneficiary"
        isPending={createMutation.isPending}
        error={createMutation.isError ? createMutation.error : undefined}
        onCancel={() => navigate('/beneficiaries')}
        onSubmit={(payload) =>
          createMutation.mutate(payload, {
            onSuccess: (b) => navigate(`/beneficiaries/${b.id}`),
          })
        }
      />
    </div>
  )
}
