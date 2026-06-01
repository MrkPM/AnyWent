/**
 * In-process cron jobs — imported once at API startup.
 *
 * Rules:
 * - Jobs must never throw to the caller — all errors are caught, logged, and sent to Sentry.
 * - A failing job never affects the main API process.
 * - If Railway/Render restarts the dyno, the next cron tick resumes automatically.
 *   If this becomes unreliable, extract computeWindows into a separate cron script
 *   (same pattern as api/jobs/scrapers/) and invoke it via the hosting cron service.
 */

import cron from 'node-cron'
import * as Sentry from '@sentry/node'
import { computeWindows } from './computeWindows.js'

export function registerJobs(): void {
  // Recompute event windows daily at 03:00 UTC
  cron.schedule('0 3 * * *', async () => {
    console.log('[cron] computing event windows…')
    try {
      await computeWindows()
      console.log('[cron] event windows done')
    } catch (err) {
      console.error('[cron] event windows failed', err)
      Sentry.captureException(err)
    }
  })
}
