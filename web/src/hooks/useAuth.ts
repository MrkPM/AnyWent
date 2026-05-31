// Only file in the codebase that imports from @clerk/react
import { ClerkProvider, useUser, useAuth as useClerkAuth } from '@clerk/react'
import type { AuthUser } from '../types/index.js'

export { ClerkProvider as AuthProvider }

export function useCurrentUser(): AuthUser | null {
  const { user } = useUser()
  if (!user) return null
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? '',
  }
}

// Returns Clerk's getToken — call it inside an async function to get a fresh JWT.
// Use this when making authenticated API calls; don't pass the token as a prop.
export function useGetToken(): () => Promise<string | null> {
  const { getToken } = useClerkAuth()
  return getToken
}
