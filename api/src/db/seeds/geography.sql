-- Geography seed
-- Safe to re-run (ON CONFLICT DO NOTHING throughout)
-- To add a city: add a row to the cities CTE. Add its region/country first if needed.

-- -------------------------
-- Countries
-- -------------------------

INSERT INTO countries (id, name, code) VALUES
  (uuid_generate_v4(), 'Germany',        'DE'),
  (uuid_generate_v4(), 'Netherlands',    'NL'),
  (uuid_generate_v4(), 'Czech Republic', 'CZ')
ON CONFLICT (code) DO NOTHING;

-- -------------------------
-- Regions
-- -------------------------
-- Add new regions here. Match country_code to the countries table above.

WITH c AS (SELECT id, code FROM countries)
INSERT INTO regions (id, country_id, name, local_name, slug)
SELECT
  uuid_generate_v4(),
  c.id,
  r.name,
  r.local_name,
  r.slug
FROM (VALUES
  -- country_code, name,            local_name,              slug
  ('DE', 'Berlin',                  'Berlin',                'berlin'),
  ('NL', 'Noord-Holland',           'Noord-Holland',         'noord-holland'),
  ('CZ', 'Prague Region',           'Hlavní město Praha',    'prague-region')
) AS r(country_code, name, local_name, slug)
JOIN c ON c.code = r.country_code
ON CONFLICT (country_id, slug) DO NOTHING;

-- -------------------------
-- Cities
-- -------------------------
-- Add new cities here. Match country_code + region_slug to the rows above.
-- active = true means the city is in scope for scraping and discovery.

WITH r AS (
  SELECT
    rg.id          AS region_id,
    rg.slug        AS region_slug,
    co.code        AS country_code
  FROM regions rg
  JOIN countries co ON rg.country_id = co.id
)
INSERT INTO cities (id, region_id, name, slug, lat, lng, active)
SELECT
  uuid_generate_v4(),
  r.region_id,
  city.name,
  city.slug,
  city.lat,
  city.lng,
  true
FROM (VALUES
  -- country_code, region_slug,     name,        slug,          lat,        lng
  ('DE', 'berlin',                  'Berlin',    'berlin',      52.520008,  13.404954),
  ('NL', 'noord-holland',           'Amsterdam', 'amsterdam',   52.367573,  4.904139),
  ('CZ', 'prague-region',           'Prague',    'prague',      50.075538,  14.437800)
) AS city(country_code, region_slug, name, slug, lat, lng)
JOIN r ON r.country_code = city.country_code
      AND r.region_slug  = city.region_slug
ON CONFLICT (slug) DO NOTHING;

-- Verify
SELECT
  co.code,
  co.name  AS country,
  rg.name  AS region,
  ci.name  AS city,
  ci.slug,
  ci.lat,
  ci.lng,
  ci.active
FROM cities ci
JOIN regions  rg ON ci.region_id  = rg.id
JOIN countries co ON rg.country_id = co.id
ORDER BY co.code, ci.name;
