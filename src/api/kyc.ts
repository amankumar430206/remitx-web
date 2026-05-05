import { apiClient } from './client'

export type KycStatus = 'not_started' | 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected'

export interface KycDocument {
  filename: string
  storedAs?: string
  mimetype?: string
  size?: number
  uploadedAt: string
}

export interface KycApplication {
  id: string
  status: string
  documents: KycDocument[]
  reviewed_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface KycStatusData {
  kycStatus: KycStatus
  kycExpiresAt?: string
  application: KycApplication | null
}

const kyc = {
  status: () =>
    apiClient.get<{ success: boolean; data: KycStatusData }>('/compliance/kyc/status'),

  initiate: () =>
    apiClient.post<{ success: boolean; data: KycApplication }>('/compliance/kyc/initiate'),

  uploadDocument: (file: File, type: string, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('document', file)
    form.append('type', type)
    return apiClient.post<{ success: boolean; data: KycApplication }>(
      '/compliance/kyc/documents',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
        },
      }
    )
  },
}

export default kyc
