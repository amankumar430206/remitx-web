import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { FormField } from '@/components/ui/molecules/FormField'
import { EmptyState } from '@/components/ui/molecules/EmptyState'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Input } from '@/components/ui/atoms/Input'
import { ContentCard } from '@/layouts/ContentCard'

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  slug: z.string().min(2, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  contactEmail: z.string().email('Valid email required'),
})

type FormValues = z.infer<typeof schema>

interface SubClient {
  id: string
  name: string
  slug: string
  contactEmail: string
  status: 'active' | 'suspended'
  createdAt: string
}

export function SubClients() {
  const [showForm, setShowForm] = useState(false)
  const [subClients] = useState<SubClient[]>([])
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    reset()
    setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sub-clients"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Sub-clients' }]}
        actions={
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancel' : 'Add sub-client'}
          </Button>
        }
      />

      {showForm && (
        <ContentCard>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">New sub-client</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Name" error={errors.name?.message} required htmlFor="sc-name">
                  <Input id="sc-name" {...register('name')} error={!!errors.name} />
                </FormField>
                <FormField label="Slug" error={errors.slug?.message} required htmlFor="sc-slug">
                  <Input id="sc-slug" {...register('slug')} placeholder="e.g. acme-corp" error={!!errors.slug} />
                </FormField>
                <FormField label="Contact email" error={errors.contactEmail?.message} required htmlFor="sc-email">
                  <Input id="sc-email" type="email" {...register('contactEmail')} error={!!errors.contactEmail} />
                </FormField>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); reset() }}>Cancel</Button>
                <Button type="submit" loading={saving}>Create sub-client</Button>
              </div>
            </div>
          </form>
        </ContentCard>
      )}

      {subClients.length === 0 ? (
        <EmptyState
          title="No sub-clients"
          description="Sub-clients allow you to manage separate payment flows under one account."
          action={<Button size="sm" onClick={() => setShowForm(true)}>Add sub-client</Button>}
        />
      ) : (
        <ContentCard padding="none">
          <ul className="divide-y divide-border">
            {subClients.map(sc => (
              <li key={sc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{sc.name}</p>
                  <p className="text-xs text-muted-fg">{sc.slug} · {sc.contactEmail}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={sc.status} />
                  <p className="text-xs text-muted-fg">{new Date(sc.createdAt).toLocaleDateString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}
    </div>
  )
}
