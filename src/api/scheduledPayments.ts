import { apiClient } from './client'

export type ScheduleFrequency = 'once' | 'weekly' | 'monthly'
export type ScheduleStatus    = 'active' | 'cancelled' | 'completed'

export interface ScheduledPayment {
  id:                    string
  tenant_id:             string
  user_id:               string
  beneficiary_id:        string
  account_id:            string
  source_currency:       string
  dest_currency:         string
  source_amount:         string
  purpose_code:          string
  note:                  string | null
  frequency:             ScheduleFrequency
  scheduled_for:         string
  end_date:              string | null
  status:                ScheduleStatus
  execution_count:       number
  last_executed_at:      string | null
  last_payment_id:       string | null
  balance_insufficient:  boolean
  balance_alert_last_day: number | null
  created_at:            string
  updated_at:            string
}

export interface CreateScheduledPaymentPayload {
  beneficiaryId:  string
  accountId:      string
  sourceCurrency: string
  destCurrency:   string
  sourceAmount:   number
  purposeCode:    string
  note?:          string | null
  frequency:      ScheduleFrequency
  scheduledFor:   string
  endDate?:       string | null
}

export interface UpdateScheduledPaymentPayload {
  scheduledFor?: string
  endDate?:      string | null
  note?:         string | null
}

const scheduledPaymentsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; data: ScheduledPayment[]; meta: { page: number; limit: number; total: number } }>(
      '/scheduled-payments', { params }
    ),

  get: (id: string) =>
    apiClient.get<{ success: boolean; data: ScheduledPayment }>(`/scheduled-payments/${id}`),

  create: (payload: CreateScheduledPaymentPayload) =>
    apiClient.post<{ success: boolean; data: ScheduledPayment }>('/scheduled-payments', payload),

  update: (id: string, payload: UpdateScheduledPaymentPayload) =>
    apiClient.put<{ success: boolean; data: ScheduledPayment }>(`/scheduled-payments/${id}`, payload),

  cancel: (id: string) =>
    apiClient.delete<{ success: boolean; data: ScheduledPayment }>(`/scheduled-payments/${id}`),

  skip: (id: string) =>
    apiClient.post<{ success: boolean; data: ScheduledPayment }>(`/scheduled-payments/${id}/skip`, {}),

  executeNow: (id: string) =>
    apiClient.post<{ success: boolean; data: { scheduled: ScheduledPayment; payment: { id: string; reference: string; status: string } } }>(
      `/scheduled-payments/${id}/execute`, {}
    ),
}

export default scheduledPaymentsApi
