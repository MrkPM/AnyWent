-- Tier 1 city expansion: 13 new cities
-- Countries added: Austria (AT), Italy (IT), Portugal (PT)
-- Countries already present: Germany (DE), Spain (ES), France (FR), Netherlands (NL)

-- -------------------------
-- Countries
-- -------------------------

INSERT INTO countries (name, code) VALUES
  ('Austria',  'AT'),
  ('Italy',    'IT'),
  ('Portugal', 'PT')
ON CONFLICT (code) DO NOTHING;

-- -------------------------
-- Regions
-- -------------------------
-- Note: Balearic Islands (ES) already exists from migration 011 — Ibiza uses it.

INSERT INTO regions (country_id, name, local_name, slug) VALUES
  -- Austria
  ((SELECT id FROM countries WHERE code = 'AT'), 'Vienna',                      'Wien',                            'vienna'),
  -- Germany
  ((SELECT id FROM countries WHERE code = 'DE'), 'Bavaria',                     'Bayern',                          'bavaria'),
  ((SELECT id FROM countries WHERE code = 'DE'), 'Saxony',                      'Sachsen',                         'saxony'),
  -- France
  ((SELECT id FROM countries WHERE code = 'FR'), 'Auvergne-Rhône-Alpes',        'Auvergne-Rhône-Alpes',            'auvergne-rhone-alpes'),
  ((SELECT id FROM countries WHERE code = 'FR'), 'Provence-Alpes-Côte d''Azur', 'Provence-Alpes-Côte d''Azur',     'provence-alpes-cote-dazur'),
  -- Italy
  ((SELECT id FROM countries WHERE code = 'IT'), 'Tuscany',                     'Toscana',                         'tuscany'),
  ((SELECT id FROM countries WHERE code = 'IT'), 'Lombardy',                    'Lombardia',                       'lombardy'),
  ((SELECT id FROM countries WHERE code = 'IT'), 'Lazio',                       'Lazio',                           'lazio'),
  -- Netherlands
  ((SELECT id FROM countries WHERE code = 'NL'), 'South Holland',               'Zuid-Holland',                    'south-holland'),
  -- Portugal
  ((SELECT id FROM countries WHERE code = 'PT'), 'Lisbon Region',               'Área Metropolitana de Lisboa',    'lisbon-region'),
  ((SELECT id FROM countries WHERE code = 'PT'), 'Norte',                       'Norte',                           'norte')
ON CONFLICT (country_id, slug) DO NOTHING;

-- -------------------------
-- Cities
-- -------------------------

WITH r AS (
  SELECT rg.id AS region_id, rg.slug AS region_slug, co.code AS country_code
  FROM regions rg
  JOIN countries co ON rg.country_id = co.id
)
INSERT INTO cities (region_id, name, slug, lat, lng, active)
SELECT r.region_id, city.name, city.slug, city.lat, city.lng, true
FROM (VALUES
  -- country_code  region_slug                    name          slug        lat        lng
  ('AT', 'vienna',                                'Vienna',     'vienna',   48.2082,   16.3738),
  ('DE', 'saxony',                                'Dresden',    'dresden',  51.0504,   13.7373),
  ('DE', 'bavaria',                               'Munich',     'munich',   48.1351,   11.5820),
  ('ES', 'balearic-islands',                      'Ibiza',      'ibiza',    38.9067,    1.4206),
  ('FR', 'auvergne-rhone-alpes',                  'Lyon',       'lyon',     45.7640,    4.8357),
  ('FR', 'provence-alpes-cote-dazur',             'Marseille',  'marseille',43.2965,    5.3698),
  ('FR', 'provence-alpes-cote-dazur',             'Nice',       'nice',     43.7102,    7.2620),
  ('IT', 'tuscany',                               'Florence',   'florence', 43.7696,   11.2558),
  ('IT', 'lombardy',                              'Milan',      'milan',    45.4654,    9.1859),
  ('IT', 'lazio',                                 'Rome',       'rome',     41.9028,   12.4964),
  ('NL', 'south-holland',                         'The Hague',  'thehague', 52.0705,    4.3007),
  ('PT', 'lisbon-region',                         'Lisbon',     'lisbon',   38.7169,   -9.1399),
  ('PT', 'norte',                                 'Porto',      'porto',    41.1579,   -8.6291)
) AS city(country_code, region_slug, name, slug, lat, lng)
JOIN r ON r.country_code = city.country_code
      AND r.region_slug  = city.region_slug
ON CONFLICT (slug) DO NOTHING;
