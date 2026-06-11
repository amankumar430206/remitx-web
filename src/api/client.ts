import axios, { type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth + tenant headers on every request
apiClient.interceptors.request.use((config) => {
  const { accessToken, tenantSlug } = useAuthStore.getState()
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  if (tenantSlug) config.headers['X-Tenant-Slug'] = tenantSlug
  return config
})

let refreshPromise: Promise<string> | null = null

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original: AxiosRequestConfig & { _retry?: boolean } = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const { refreshToken, tenantSlug } = useAuthStore.getState()
            const { data } = await axios.post(
              `${BASE_URL}/auth/refresh`,
              { refreshToken },
              { headers: { 'X-Tenant-Slug': tenantSlug } }
            )
            const newAccess: string = data.data.accessToken
            useAuthStore.getState().updateTokens(newAccess, data.data.refreshToken)
            return newAccess
          })().finally(() => { refreshPromise = null })
        }
        const newToken = await refreshPromise
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` }
        return apiClient(original)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    if (error.response?.status === 403) {
      const msg = error.response?.data?.error?.message
      toast.error(msg ?? "You don't have permission to perform this action.")
    }
    return Promise.reject(error)
  }
)
