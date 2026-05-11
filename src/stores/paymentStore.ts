import { create } from 'zustand'
import type { FxQuote } from '@/api/fx'

export interface PaymentStepState {
  // Step 1
  beneficiaryId: string
  beneficiaryName: string
  beneficiaryCountry: string
  // Step 2
  accountId: string
  sourceAmount: string
  sourceCurrency: string
  destinationCurrency: string
  quote: FxQuote | null
  // Step 3 / meta
  purposeCode: string
  note: string
  // Step 4
  idempotencyKey: string
}

interface PaymentStore {
  step: number
  data: Partial<PaymentStepState>
  setStep: (step: number) => void
  setData: (data: Partial<PaymentStepState>) => void
  reset: () => void
}

const INITIAL: Partial<PaymentStepState> = {}

export const usePaymentStore = create<PaymentStore>()((set) => ({
  step: 1,
  data: INITIAL,
  setStep: (step) => set({ step }),
  setData: (data) => set((s) => ({ data: { ...s.data, ...data } })),
  reset: () => set({ step: 1, data: INITIAL }),
}))
