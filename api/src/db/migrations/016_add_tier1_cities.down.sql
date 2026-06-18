-- Reverses 016_add_tier1_cities.up.sql
-- Delete in reverse FK order: cities → regions → countries

DELETE FROM cities WHERE slug IN (
  'vienna', 'dresden', 'munich', 'ibiza',
  'lyon', 'marseille', 'nice',
  'florence', 'milan', 'rome',
  'thehague', 'lisbon', 'porto'
);

-- Only remove regions added in this migration (balearic-islands stays — used by Mallorca from 011)
DELETE FROM regions WHERE slug IN (
  'vienna',
  'bavaria', 'saxony',
  'auvergne-rhone-alpes', 'provence-alpes-cote-dazur',
  'tuscany', 'lombardy', 'lazio',
  'south-holland',
  'lisbon-region', 'norte'
);

-- Remove countries added in this migration only
DELETE FROM countries WHERE code IN ('AT', 'IT', 'PT');
