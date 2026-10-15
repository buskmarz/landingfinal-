ALTER TABLE freak_people ADD COLUMN IF NOT EXISTS phone text;
CREATE UNIQUE INDEX IF NOT EXISTS freak_people_phone ON freak_people(campaign,phone) WHERE phone IS NOT NULL;
ALTER TABLE freak_campaigns ADD COLUMN IF NOT EXISTS public_hint text NOT NULL DEFAULT '';
ALTER TABLE freak_campaigns ADD COLUMN IF NOT EXISTS hint_updated_at timestamptz;
ALTER TABLE freak_campaigns ADD COLUMN IF NOT EXISTS hint_version integer NOT NULL DEFAULT 0;
ALTER TABLE freak_tickets ADD COLUMN IF NOT EXISTS received_phone text;
