CREATE TABLE IF NOT EXISTS freak_pin_resets (
 id bigserial PRIMARY KEY,
 campaign text NOT NULL REFERENCES freak_campaigns(id),
 person uuid NOT NULL REFERENCES freak_people(id),
 admin text NOT NULL REFERENCES freak_admins(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
