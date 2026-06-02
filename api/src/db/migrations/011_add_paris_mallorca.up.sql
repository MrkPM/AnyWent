-- France → Île-de-France → Paris
INSERT INTO countries (name, code) VALUES ('France', 'FR');

INSERT INTO regions (country_id, name, local_name, slug)
VALUES (
  (SELECT id FROM countries WHERE code = 'FR'),
  'Île-de-France', 'Île-de-France', 'ile-de-france'
);

INSERT INTO cities (region_id, name, slug, lat, lng, active)
VALUES (
  (SELECT r.id FROM regions r JOIN countries c ON c.id = r.country_id
   WHERE c.code = 'FR' AND r.slug = 'ile-de-france'),
  'Paris', 'paris', 48.8566, 2.3522, true
);

-- Spain → Balearic Islands → Mallorca
-- RA area 661 covers the whole island; city represents the main destination.
INSERT INTO countries (name, code) VALUES ('Spain', 'ES');

INSERT INTO regions (country_id, name, local_name, slug)
VALUES (
  (SELECT id FROM countries WHERE code = 'ES'),
  'Balearic Islands', 'Illes Balears', 'balearic-islands'
);

INSERT INTO cities (region_id, name, slug, lat, lng, active)
VALUES (
  (SELECT r.id FROM regions r JOIN countries c ON c.id = r.country_id
   WHERE c.code = 'ES' AND r.slug = 'balearic-islands'),
  'Mallorca', 'mallorca', 39.6953, 3.0176, true
);
