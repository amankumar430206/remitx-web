import { apiClient } from './client'

export type KycStatus = 'not_started' | 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected'

export interface KycDocument {
  id: string
  type: string
  filename: string
  status: 'pending' | 'approved' | 'rejected'
  uploadedAt: string
}

export interface KycStatusData {
  status: KycStatus
  submittedAt?: string
  reviewedAt?: string
  expiresAt?: string
  rejectionReason?: string
  documents: KycDocument[]
}

const kyc = {
  status: () =>
    apiClient.get<{ success: boolean; data: KycStatusData }>('/compliance/kyc/status'),

  initiate: () =>
    apiClient.post<{ success: boolean; data: KycStatusData }>('/compliance/kyc/initiate'),

  uploadDocument: (file: File, type: string, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('document', file)
    form.append('type', type)
    return apiClient.post<{ success: boolean; data: KycDocument }>(
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
