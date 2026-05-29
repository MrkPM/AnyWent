ALTER TABLE scraper_runs
  DROP CONSTRAINT scraper_runs_source_check,
  ADD CONSTRAINT scraper_runs_source_check
    CHECK (source IN ('ra', 'songkick', 'dice', 'goout', 'email', 'manual'));
