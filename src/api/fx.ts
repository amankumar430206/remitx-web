import { apiClient } from './client'

export interface FxRate { from: string; to: string; rate: string; updatedAt: string }
export interface FxQuote {
  quoteId: string
  from: string
  to: string
  fromAmount: string
  toAmount: string
  rate: string
  spread: string
  expiresAt: string
}

const fx = {
  rates: () => apiClient.get<{ success: boolean; data: FxRate[] }>('/fx/rates'),

  quote: (from: string, to: string, fromAmount: string) =>
    apiClient.post<{ success: boolean; data: FxQuote }>('/fx/quote', { from, to, fromAmount }),

  getQuote: (quoteId: string) =>
    apiClient.get<{ success: boolean; data: FxQuote }>(`/fx/quote/${quoteId}`),
}

export default fx
