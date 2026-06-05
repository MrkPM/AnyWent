// One-off script to trigger Spotify sync for a user.
// Run from api/: pnpm tsx --env-file=../.env jobs/scripts/sync-spotify.ts

import { syncSpotifyForUser } from '../../src/jobs/spotify-sync.js'

const USER_ID = 'user_3EVjghMRrbtbclluHPEvSUZoexq'

console.log(`[sync-spotify] syncing for ${USER_ID} …`)
await syncSpotifyForUser(USER_ID)
console.log('[sync-spotify] done')
