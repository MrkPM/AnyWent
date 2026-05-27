-- Migration 001: rollback
-- Drop in reverse dependency order

DROP TABLE IF EXISTS user_saved_events;
DROP TABLE IF EXISTS user_attendance;
DROP TABLE IF EXISTS user_venue_affinity;
DROP TABLE IF EXISTS user_artist_affinity;
DROP TABLE IF EXISTS user_connected_accounts;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS event_artists;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS artists;
DROP TABLE IF EXISTS venues;
DROP TABLE IF EXISTS cities;
DROP TABLE IF EXISTS regions;
DROP TABLE IF EXISTS countries;
