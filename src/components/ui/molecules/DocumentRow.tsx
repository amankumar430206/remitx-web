import { useState } from 'react'
import type { AxiosResponse } from 'axios'

export interface DocumentMeta {
  filename: string
  type?: string | null
  storedAs?: string
  mimetype?: string
  size?: number
  uploadedAt: string
}

interface Props {
  doc: DocumentMeta
  /** Returns the authenticated blob. Called when the user clicks Preview or Download. */
  fetchFn: () => Promise<AxiosResponse<Blob>>
  /** Show document type label above filename (default: true) */
  showType?: boolean
}

const DOC_TYPE_LABEL: Record<string, string> = {
  passport: 'Passport',
  national_id: 'National ID',
  drivers_license: "Driver's licence",
  proof_of_address: 'Proof of address',
  utility_bill: 'Utility bill',
  bank_statement: 'Bank statement',
}

function formatBytes(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getExt(mimetype?: string, filename?: string) {
  if (mimetype) {
    const map: Record<string, string> = {
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
      'image/webp': 'WEBP',
      'application/pdf': 'PDF',
    }
    if (map[mimetype]) return map[mimetype]
  }
  const ext = filename?.split('.').pop()?.toUpperCase()
  return ext ?? 'FILE'
}

export function DocumentRow({ doc, fetchFn, showType = true }: Props) {
  const [loading, setLoading] = useState<'preview' | 'download' | null>(null)

  const label = showType && doc.type ? (DOC_TYPE_LABEL[doc.type] ?? doc.type) : null
  const uploadedAt = new Date(doc.uploadedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const ext = getExt(doc.mimetype, doc.filename)
  const sizeStr = formatBytes(doc.size)

  const fetchBlob = async (mode: 'preview' | 'download') => {
    setLoading(mode)
    try {
      const res = await fetchFn()
      const blob = res.data
      const url = URL.createObjectURL(blob)
      if (mode === 'preview') {
        window.open(url, '_blank', 'noopener,noreferrer')
        // Revoke after a short delay to allow the browser to load
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = doc.filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }
    } catch {
      // silently fail — the request interceptor handles 401s globally
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3">
      {/* File type pill */}
      <div className="h-9 w-9 rounded-lg bg-primary-subtle flex items-center justify-center flex-shrink-0">
        <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      {/* Metadata */}
      <div className="flex-1 min-w-0">
        {label && (
          <p className="text-sm font-medium text-foreground truncate">{label}</p>
        )}
        <p className={`text-xs text-muted-fg truncate ${label ? '' : 'text-sm font-medium text-foreground'}`}>
          {doc.filename}
          {sizeStr ? ` · ${sizeStr}` : ''}
          {' · '}
          {uploadedAt}
        </p>
      </div>

      {/* Extension pill */}
      <span className="text-[10px] font-semibold text-muted-fg/70 uppercase tracking-wide shrink-0 hidden sm:block">
        {ext}
      </span>

      {/* Actions */}
      {doc.storedAs && (
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => fetchBlob('preview')}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-primary bg-primary-subtle hover:bg-primary-subtle/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'preview' ? (
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
            Preview
          </button>

          <button
            type="button"
            disabled={loading !== null}
            onClick={() => fetchBlob('download')}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === 'download' ? (
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            Download
          </button>
        </div>
      )}
    </div>
  )
}
