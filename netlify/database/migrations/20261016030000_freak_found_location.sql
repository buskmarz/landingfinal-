-- Optional location shared at the successful claim, private to administration.
ALTER TABLE freak_tickets ADD COLUMN IF NOT EXISTS found_latitude double precision;
ALTER TABLE freak_tickets ADD COLUMN IF NOT EXISTS found_longitude double precision;
ALTER TABLE freak_tickets ADD COLUMN IF NOT EXISTS found_accuracy double precision;
ALTER TABLE freak_tickets ADD CONSTRAINT freak_found_location_valid CHECK (
 (found_latitude IS NULL AND found_longitude IS NULL AND found_accuracy IS NULL) OR
 (owner IS NOT NULL AND found_latitude IS NOT NULL AND found_longitude IS NOT NULL AND found_accuracy IS NOT NULL
 AND found_latitude BETWEEN -90 AND 90 AND found_longitude BETWEEN -180 AND 180 AND found_accuracy BETWEEN 0 AND 100000)
);
