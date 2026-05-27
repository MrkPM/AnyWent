import { verifyToken } from '@clerk/backend'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { AuthUser } from '@anywent/shared'
import { env } from '../config/env.js'

// Only file in the codebase that imports from @clerk/backend
declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
  }
}

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
