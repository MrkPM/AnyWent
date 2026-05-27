-- Migration 002: scraper run log
-- Tracks every scraper execution — used by /health endpoint and for debugging

CREATE TABLE scraper_runs (
  id               uuid     PRIMARY KEY DEFAULT uuid_generate_v4(),
  source           text     NOT NULL CHECK (source IN ('ra', 'songkick', 'dice', 'email', 'manual')),
  started_at       timestamptz NOT NULL,
  finished_at      timestamptz,
  events_upserted  integer  DEFAULT 0,
  errors           jsonb    DEFAULT '[]',
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_scraper_runs_source     ON scraper_runs(source);
CREATE INDEX idx_scraper_runs_started_at ON scraper_runs(started_at);
