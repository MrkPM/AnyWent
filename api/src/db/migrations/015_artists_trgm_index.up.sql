CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX artists_name_trgm_idx ON artists USING GIN (name gin_trgm_ops);
