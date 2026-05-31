-- Remove 'project_space' from venues type constraint
-- WARNING: only safe if no rows with type = 'project_space' exist
ALTER TABLE venues
  DROP CONSTRAINT venues_type_check,
  ADD CONSTRAINT venues_type_check
    CHECK (type IN ('club', 'concert_hall', 'museum', 'gallery', 'festival_site', 'other'));
