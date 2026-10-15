-- Keep immutable ticket keys, QR hashes, short codes and ownership unchanged.
ALTER TABLE freak_tickets ADD COLUMN display_number integer CHECK(display_number BETWEEN 1 AND 100);
WITH ordered AS (SELECT campaign,number,row_number() OVER(PARTITION BY campaign ORDER BY act,number)::int AS ordinal FROM freak_tickets)
UPDATE freak_tickets t SET display_number=o.ordinal FROM ordered o WHERE t.campaign=o.campaign AND t.number=o.number;
CREATE UNIQUE INDEX freak_ticket_display_number ON freak_tickets(campaign,display_number);
-- Existing long recovery secrets remain valid when a signed-in person adds a short key.
ALTER TABLE freak_people ADD COLUMN short_recovery_hash text;
ALTER TABLE freak_people ADD COLUMN short_recovery_salt text;
ALTER TABLE freak_people ADD COLUMN recovery_length integer NOT NULL DEFAULT 24;
