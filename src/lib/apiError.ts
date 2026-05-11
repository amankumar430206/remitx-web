/**
 * Extracts the human-readable message from an Axios API error response.
 * Falls back to `fallback` if the response doesn't carry a message.
 */
export function getApiError(error: unknown, fallback = 'An unexpected error occurred.'): string {
  const msg = (error as { response?: { data?: { error?: { message?: string } } } })
    ?.response?.data?.error?.message
  return msg?.trim() || fallback
}
