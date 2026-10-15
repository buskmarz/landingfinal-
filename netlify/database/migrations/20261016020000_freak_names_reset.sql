ALTER TABLE freak_people ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE freak_tickets ADD COLUMN IF NOT EXISTS received_name text;
CREATE TABLE IF NOT EXISTS freak_reset_audit (
 id bigserial PRIMARY KEY,campaign text NOT NULL REFERENCES freak_campaigns(id),
 number integer,admin text NOT NULL REFERENCES freak_admins(id),
 snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
