export interface ApiErrorDetail {
  field: string
  message: string
}

type ApiErrorShape = {
  response?: {
    data?: {
      error?: {
        message?: string
        details?: ApiErrorDetail[]
      }
    }
  }
}

/**
 * Extracts the human-readable message from an Axios API error response.
 * Falls back to `fallback` if the response doesn't carry a message.
 */
export function getApiError(error: unknown, fallback = 'An unexpected error occurred.'): string {
  const msg = (error as ApiErrorShape)?.response?.data?.error?.message
  return msg?.trim() || fallback
}

/**
 * Extracts field-level validation details from an Axios API error response.
 * Returns an empty array when there are no details (e.g. non-validation errors).
 */
export function getApiErrorDetails(error: unknown): ApiErrorDetail[] {
  return (error as ApiErrorShape)?.response?.data?.error?.details ?? []
}
