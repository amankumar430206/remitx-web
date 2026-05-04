import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { FileUpload } from '@/components/ui/organisms/FileUpload'
import type { UploadedFile } from '@/components/ui/organisms/FileUpload'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { ContentCard } from '@/layouts/ContentCard'
import { useKycStatus } from '@/hooks/useKyc'
import kycApi from '@/api/kyc'

const DOC_TYPES = [
  { id: 'passport', label: 'Passport', hint: 'Bio-data / photo page', required: true, group: 'id' },
  { id: 'national_id', label: 'National ID card', hint: 'Front and back side', required: false, group: 'id' },
  { id: 'driving_license', label: 'Driving licence', hint: 'Front and back side', required: false, group: 'id' },
  { id: 'proof_of_address', label: 'Proof of address', hint: 'Utility bill or bank statement — max 3 months old', required: true, group: 'address' },
]

type UploadState = {
  status: 'idle' | 'uploading' | 'success' | 'error'
  progress: number
  filename?: string
  error?: string
}

export function KycVerify() {
  const navigate = useNavigate()
  const { data: kyc, isLoading, isError, refetch } = useKycStatus()
  const [uploads, setUploads] = useState<Record<string, UploadState>>({})

  const handleUpload = async (docType: string, files: File[]) => {
    const file = files[0]
    if (!file) return

    setUploads(prev => ({
      ...prev,
      [docType]: { status: 'uploading', progress: 0, filename: file.name },
    }))

    try {
      await kycApi.uploadDocument(file, docType, pct => {
        setUploads(prev => ({
          ...prev,
          [docType]: { ...prev[docType], progress: pct },
        }))
      })
      setUploads(prev => ({
        ...prev,
        [docType]: { status: 'success', progress: 100, filename: file.name },
      }))
      refetch()
    } catch {
      setUploads(prev => ({
        ...prev,
        [docType]: { status: 'error', progress: 0, filename: file.name, error: 'Upload failed. Please try again.' },
      }))
    }
  }

  const toUploadedFile = (docType: string): UploadedFile[] => {
    const state = uploads[docType]
    if (!state || state.status === 'idle') {
      const existing = (kyc?.documents ?? []).find(d => d.type === docType)
      if (existing) {
        return [{ name: existing.filename, size: 0, status: 'success' }]
      }
      return []
    }
    return [{
      name: state.filename ?? docType,
      size: 0,
      status: state.status === 'uploading' ? 'uploading' : state.status === 'success' ? 'success' : 'error',
      progress: state.progress,
      error: state.error,
    }]
  }

  const idUploaded = DOC_TYPES
    .filter(d => d.group === 'id')
    .some(d => uploads[d.id]?.status === 'success' || (kyc?.documents ?? []).some(doc => doc.type === d.id))

  const addressUploaded =
    uploads['proof_of_address']?.status === 'success' ||
    (kyc?.documents ?? []).some(doc => doc.type === 'proof_of_address')

  const allDone = idUploaded && addressUploaded

  if (isLoading) return <LoadingState message="Loading…" />
  if (isError) return <ErrorState title="Could not load KYC status" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <PageHeader
        title="Upload documents"
        breadcrumbs={[
          { label: 'KYC', href: '/kyc' },
          { label: 'Verify' },
        ]}
      />

      {/* ID document */}
      <ContentCard>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-foreground">Government ID</h3>
          {idUploaded && <Badge variant="success">Uploaded</Badge>}
        </div>
        <p className="text-xs text-muted-fg mb-4">Upload one of the following documents.</p>

        <div className="flex flex-col gap-6">
          {DOC_TYPES.filter(d => d.group === 'id').map(doc => {
            const alreadyUploaded =
              uploads[doc.id]?.status === 'success' ||
              (kyc?.documents ?? []).some(d => d.type === doc.id)
            const isUploading = uploads[doc.id]?.status === 'uploading'

            return (
              <div key={doc.id}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-foreground">{doc.label}</p>
                  <p className="text-xs text-muted-fg">— {doc.hint}</p>
                </div>
                <FileUpload
                  accept=".jpg,.jpeg,.png,.pdf"
                  maxSizeMB={10}
                  disabled={isUploading || (alreadyUploaded && !uploads[doc.id]?.error)}
                  onFilesSelected={files => handleUpload(doc.id, files)}
                  uploadedFiles={toUploadedFile(doc.id)}
                  onRemoveFile={() => setUploads(prev => ({ ...prev, [doc.id]: { status: 'idle', progress: 0 } }))}
                />
              </div>
            )
          })}
        </div>
      </ContentCard>

      {/* Proof of address */}
      <ContentCard>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-foreground">Proof of address</h3>
          {addressUploaded && <Badge variant="success">Uploaded</Badge>}
        </div>
        <p className="text-xs text-muted-fg mb-4">
          {DOC_TYPES.find(d => d.id === 'proof_of_address')?.hint}
        </p>
        <FileUpload
          accept=".jpg,.jpeg,.png,.pdf"
          maxSizeMB={10}
          disabled={uploads['proof_of_address']?.status === 'uploading'}
          onFilesSelected={files => handleUpload('proof_of_address', files)}
          uploadedFiles={toUploadedFile('proof_of_address')}
          onRemoveFile={() => setUploads(prev => ({ ...prev, proof_of_address: { status: 'idle', progress: 0 } }))}
        />
      </ContentCard>

      {/* Requirements */}
      <ContentCard>
        <h3 className="text-sm font-semibold text-foreground mb-3">Requirements</h3>
        <ul className="flex flex-col gap-1.5">
          {[
            'Files must be JPG, PNG, or PDF',
            'Maximum file size: 10 MB',
            'Documents must be valid and not expired',
            'Proof of address must be dated within the last 3 months',
            'All text must be clearly visible',
          ].map(req => (
            <li key={req} className="flex items-start gap-2 text-xs text-muted-fg">
              <svg className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {req}
            </li>
          ))}
        </ul>
      </ContentCard>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/kyc')}>
          Back to status
        </Button>
        <Button disabled={!allDone} onClick={() => navigate('/kyc')}>
          Done — view status
        </Button>
      </div>
    </div>
  )
}
