import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { PageHeader, DataTable, AmountDisplay, LoadingState, ErrorState, ConfirmDialog, FormField } from '@/components/ui/index'
import { Button } from '@/components/ui/atoms/Button'
import { Select } from '@/components/ui/atoms/Select'
import { useAccounts } from '@/hooks/useAccounts'
import accountsApi from '@/api/accounts'

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'INR', label: 'INR — Indian Rupee' },
]

export function AccountList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: accounts, isLoading, isError, isFetching } = useAccounts()
  const [createOpen, setCreateOpen] = useState(false)
  const [currency, setCurrency] = useState('')

  const createMutation = useMutation({
    mutationFn: (c: string) => accountsApi.create(c),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setCreateOpen(false)
      setCurrency('')
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Accounts"
        description="Manage your multi-currency accounts."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['accounts'] })}
              disabled={isFetching}
            >
              <svg className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New account
            </Button>
          </div>
        }
      />

      {isLoading ? <LoadingState /> : isError ? (
        <ErrorState onRetry={() => queryClient.invalidateQueries({ queryKey: ['accounts'] })} />
      ) : (
        <DataTable
          columns={[
            { key: 'currency', header: 'Currency', render: a => <span className="font-semibold">{a.currency}</span> },
            { key: 'balance', header: 'Balance', render: a => <AmountDisplay amount={a.balance} currency={a.currency} size="md" /> },
            { key: 'provider_account_id', header: 'Reference', render: a => <span className="text-muted-fg text-sm font-mono">{a.provider_account_id ?? a.account_number ?? '—'}</span> },
            { key: 'created_at', header: 'Created', render: a => <span className="text-muted-fg text-xs">{new Date(a.created_at).toLocaleDateString()}</span> },
          ]}
          data={accounts ?? []}
          getRowId={a => a.id}
          onRowClick={a => navigate(`/accounts/${a.id}`)}
          emptyTitle="No accounts yet"
          emptyDescription="Provision your first currency account to start transacting."
        />
      )}

      <ConfirmDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create account"
        confirmLabel="Create"
        onConfirm={() => currency && createMutation.mutate(currency)}
        loading={createMutation.isPending}
      >
        <FormField label="Currency" htmlFor="currency" required>
          <Select options={CURRENCIES} value={currency} onValueChange={setCurrency} placeholder="Select currency" />
        </FormField>
      </ConfirmDialog>
    </div>
  )
}
