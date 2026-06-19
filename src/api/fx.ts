import { apiClient } from './client'

export interface FxRate {
  from: string
  to: string
  clientRate: string
  midRate: string
}

export interface FxRatesResponse {
  rates: FxRate[]
  provider: 'zoqq' | 'market'
}

export type ZoqqQuoteType          = 'payout' | 'conversion'
export type ZoqqLockPeriod         = '5_mins' | '15_mins' | '1_hour' | '4_hours' | '8_hours' | '24_hours'
export type ZoqqConversionSchedule = 'immediate' | 'end_of_day' | 'next_day' | '2_days'

export interface FxQuote {
  quoteId: string
  from: string
  to: string
  fromAmount: string
  toAmount: string
  rate: string
  spread: string
  expiresAt: string
  // Present only for Zoqq-provider quotes
  quoteType?: ZoqqQuoteType
  lockPeriod?: ZoqqLockPeriod
  conversionSchedule?: ZoqqConversionSchedule
}

export interface ZoqqQuoteOpts {
  quoteType?: ZoqqQuoteType
  lockPeriod?: ZoqqLockPeriod
  conversionSchedule?: ZoqqConversionSchedule
}

const fx = {
  rates: () => apiClient.get<{ success: boolean; data: FxRatesResponse }>('/fx/rates'),

  quote: (from: string, to: string, fromAmount: string, opts?: ZoqqQuoteOpts) =>
    apiClient.post<{ success: boolean; data: FxQuote }>('/fx/quote', { from, to, fromAmount, ...opts }),

  getQuote: (quoteId: string) =>
    apiClient.get<{ success: boolean; data: FxQuote }>(`/fx/quote/${quoteId}`),
}

export default fx
