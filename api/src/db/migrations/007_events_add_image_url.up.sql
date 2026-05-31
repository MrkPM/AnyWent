-- Add image_url to events — stores the event flyer/cover image URL from the source
-- Option A: store URL and hotlink directly (no download/re-hosting for now)
-- Sources: RA (images[0].filename), GoOut (mainImage.src with %%% → 800), Songkick (image field)
ALTER TABLE events ADD COLUMN image_url text;
