DELETE FROM cities   WHERE slug = 'barcelona';
DELETE FROM regions  WHERE slug = 'catalonia'
  AND country_id = (SELECT id FROM countries WHERE code = 'ES');
