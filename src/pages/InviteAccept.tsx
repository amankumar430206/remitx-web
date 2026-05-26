import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

// Redirect to the unified onboarding wizard preserving all URL params.
export function InviteAccept() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    navigate(`/onboard?${searchParams.toString()}`, { replace: true })
  }, [navigate, searchParams])

  return null
}

export { AuthShell } from './Login'
