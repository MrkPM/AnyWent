// Only file in the codebase that imports from @clerk/backend
import { verifyToken } from '@clerk/backend'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthUser } from '@anywent/shared'
import { env } from '../config/env.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null
  }
}

// Require a valid Bearer token. Returns 401 if missing or invalid.
// After this preHandler, request.user is guaranteed non-null.
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
  try {
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })
    request.user = { id: payload.sub, email: payload.email as string }
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}

// Accept a Bearer token if present but don't require one.
// request.user is null for unauthenticated requests.
export async function authenticateOptional(request: FastifyRequest) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) { request.user = null; return }
  try {
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })
    request.user = { id: payload.sub, email: payload.email as string }
  } catch {
    request.user = null
  }
}
