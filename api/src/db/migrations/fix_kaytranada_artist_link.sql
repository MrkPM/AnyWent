INSERT INTO event_artists (event_id, artist_id, role, "order")
VALUES ('aad9dfe4-8682-4c6e-a143-6481457c84e2', '0f1962ce-2099-47f6-8764-cbde923a1210', 'headliner', 1)
ON CONFLICT DO NOTHING;
