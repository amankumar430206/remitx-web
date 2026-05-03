import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/atoms/Button'
import { Spinner } from '@/components/ui/atoms/Spinner'

export interface UploadedFile {
  name: string
  size: number
  status: 'uploading' | 'success' | 'error'
  progress?: number
  error?: string
}

export interface FileUploadProps {
  accept?: string
  multiple?: boolean
  maxSizeMB?: number
  disabled?: boolean
  className?: string
  onFilesSelected: (files: File[]) => void
  uploadedFiles?: UploadedFile[]
  onRemoveFile?: (name: string) => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({
  accept, multiple, maxSizeMB = 10, disabled, className,
  onFilesSelected, uploadedFiles = [], onRemoveFile,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const valid = Array.from(files).filter(f => f.size <= maxSizeMB * 1024 * 1024)
    if (valid.length) onFilesSelected(valid)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragOver ? 'border-primary bg-info/10' : 'border-border hover:border-border-strong bg-surface',
          disabled && 'opacity-50 pointer-events-none'
        )}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
      >
        <svg className="mb-3 h-8 w-8 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-foreground">
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => inputRef.current?.click()}
          >
            Click to upload
          </button>{' '}
          or drag and drop
        </p>
        <p className="mt-1 text-xs text-muted-fg">
          {accept ? accept.replace(/,/g, ', ') : 'Any file'} up to {maxSizeMB}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={e => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {uploadedFiles.length > 0 && (
        <ul className="flex flex-col gap-2">
          {uploadedFiles.map(file => (
            <li key={file.name} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 bg-surface-raised">
              <svg className="h-5 w-5 shrink-0 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-fg">{formatBytes(file.size)}</p>
                {file.error && <p className="text-xs text-danger-fg">{file.error}</p>}
              </div>
              {file.status === 'uploading' && <Spinner size="sm" />}
              {file.status === 'success' && (
                <svg className="h-4 w-4 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {onRemoveFile && (
                <button
                  type="button"
                  className="text-muted-fg hover:text-foreground ml-1"
                  onClick={() => onRemoveFile(file.name)}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
