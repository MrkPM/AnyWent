-- Spain → Catalonia → Barcelona
-- Spain (ES) already exists from migration 011.
-- RA area ID 20 confirmed via GraphQL { areas(searchTerm: "Barcelona", limit: 1) { id name } } 2026-06-18
-- Songkick metro area 28802 confirmed via https://www.songkick.com/metro-areas/28802-spain-barcelona 2026-06-18

INSERT INTO regions (country_id, name, local_name, slug)
VALUES (
  (SELECT id FROM countries WHERE code = 'ES'),
  'Catalonia', 'Catalunya', 'catalonia'
);

INSERT INTO cities (region_id, name, slug, lat, lng, active)
VALUES (
  (SELECT r.id FROM regions r JOIN countries c ON c.id = r.country_id
   WHERE c.code = 'ES' AND r.slug = 'catalonia'),
  'Barcelona', 'barcelona', 41.3851, 2.1734, true
);
