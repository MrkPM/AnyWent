// Only file in the codebase that imports from @clerk/react
import { ClerkProvider, useUser } from '@clerk/react'
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
