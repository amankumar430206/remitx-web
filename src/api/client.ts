import axios, { type AxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach auth + tenant headers on every request
apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth')
  if (raw) {
    const { accessToken, tenantSlug } = JSON.parse(raw) as { accessToken?: string; tenantSlug?: string }
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
    if (tenantSlug) config.headers['X-Tenant-Slug'] = tenantSlug
  }
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
            const raw = localStorage.getItem('auth')
            const { refreshToken, tenantSlug } = raw ? JSON.parse(raw) : {}
            const { data } = await axios.post(
              `${BASE_URL}/auth/refresh`,
              { refreshToken },
              { headers: { 'X-Tenant-Slug': tenantSlug } }
            )
            const newAccess: string = data.data.accessToken
            const stored = raw ? JSON.parse(raw) : {}
            localStorage.setItem('auth', JSON.stringify({ ...stored, accessToken: newAccess, refreshToken: data.data.refreshToken }))
            return newAccess
          })().finally(() => { refreshPromise = null })
        }
        const newToken = await refreshPromise
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` }
        return apiClient(original)
      } catch {
        localStorage.removeItem('auth')
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)
