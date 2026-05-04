import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { FormField } from '@/components/ui/molecules/FormField'
import { Button } from '@/components/ui/atoms/Button'
import { Select } from '@/components/ui/atoms/Select'
import { ContentCard } from '@/layouts/ContentCard'
import { useAccounts } from '@/hooks/useAccounts'
import reportsApi from '@/api/reports'

const schema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  from: z.string().min(1, 'Start date is required'),
  to: z.string().min(1, 'End date is required'),
  format: z.enum(['csv', 'pdf']),
})

type FormValues = z.infer<typeof schema>

export function Statement() {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const { data: accountsData } = useAccounts()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { format: 'csv' },
  })

  const accountOptions = (accountsData ?? []).map(a => ({
    value: a.id,
    label: `${a.currency} — ${a.accountNumber}`,
  }))

  const onSubmit = async (values: FormValues) => {
    setDownloading(true)
    setError('')
    try {
      const res = await reportsApi.statementExport({
        accountId: values.accountId,
        from: values.from,
        to: values.to,
        format: values.format,
      })
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `statement-${values.from}-${values.to}.${values.format}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Failed to export statement. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <PageHeader
        title="Account statement"
        breadcrumbs={[{ label: 'Reports', href: '/reports/transactions' }, { label: 'Statement' }]}
      />

      <ContentCard>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Export options</h3>

            <FormField label="Account" error={errors.accountId?.message} required>
              <Select
                value={watch('accountId') ?? ''}
                onValueChange={v => setValue('accountId', v)}
                options={accountOptions}
                placeholder="Select account…"
                error={!!errors.accountId}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="From" error={errors.from?.message} required htmlFor="from">
                <input
                  id="from"
                  type="date"
                  {...register('from')}
                  className="flex h-9 w-full rounded border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </FormField>

              <FormField label="To" error={errors.to?.message} required htmlFor="to">
                <input
                  id="to"
                  type="date"
                  {...register('to')}
                  className="flex h-9 w-full rounded border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </FormField>
            </div>

            <FormField label="Format" error={errors.format?.message} required>
              <Select
                value={watch('format')}
                onValueChange={v => setValue('format', v as 'csv' | 'pdf')}
                options={[
                  { value: 'csv', label: 'CSV' },
                  { value: 'pdf', label: 'PDF' },
                ]}
              />
            </FormField>

            {error && (
              <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
                {error}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={downloading}>
                Download statement
              </Button>
            </div>
          </div>
        </form>
      </ContentCard>
    </div>
  )
}
