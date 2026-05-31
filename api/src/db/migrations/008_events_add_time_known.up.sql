-- Add time_known flag so events with date-only sources (e.g. Songkick listing pages)
-- can signal that no time data is available, rather than storing a misleading midnight UTC value.
ALTER TABLE events ADD COLUMN time_known boolean NOT NULL DEFAULT true;

-- Back-fill: all existing Songkick events were stored from date-only startDate strings —
-- they all have starts_at = midnight UTC which is not a real start time.
UPDATE events SET time_known = false WHERE source = 'songkick';
