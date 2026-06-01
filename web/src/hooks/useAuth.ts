// Only file in the codebase that imports from @clerk/react
import { ClerkProvider, SignInButton, useUser, useAuth as useClerkAuth } from '@clerk/react'
import type { AuthUser } from '../types/index.js'

export { ClerkProvider as AuthProvider, SignInButton as AuthSignInButton }

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

// True once Clerk has finished determining auth state (signed-in or signed-out).
// Always wait for this before calling getToken() — getToken() will block indefinitely
// if called before Clerk has loaded, hanging any request that depends on it.
export function useAuthIsLoaded(): boolean {
  const { isLoaded } = useClerkAuth()
  return isLoaded
}
