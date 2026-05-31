-- Add 'project_space' as a valid type for venues
-- (artist-run spaces, curatorial institutions, experimental non-gallery venues)
ALTER TABLE venues
  DROP CONSTRAINT venues_type_check,
  ADD CONSTRAINT venues_type_check
    CHECK (type IN ('club', 'concert_hall', 'museum', 'gallery', 'festival_site', 'project_space', 'other'));
