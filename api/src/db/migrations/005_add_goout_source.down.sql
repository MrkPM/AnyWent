ALTER TABLE events
  DROP CONSTRAINT events_source_check,
  ADD CONSTRAINT events_source_check
    CHECK (source IN ('ra', 'songkick', 'dice', 'email', 'manual'));
