import * as Sentry from '@sentry/node'
import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify'

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  Sentry.captureException(error)
  request.log.error(error)
  reply.status(error.statusCode ?? 500).send({
    error: error.message ?? 'Internal Server Error',
  })
}
