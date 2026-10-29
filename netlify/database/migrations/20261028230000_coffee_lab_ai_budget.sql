-- Isolated budget; no changes to existing rewards, orders or visitor data.
CREATE TABLE IF NOT EXISTS coffee_lab_ai_budget (
 id text PRIMARY KEY,
 cap_cents integer NOT NULL CHECK (cap_cents BETWEEN 0 AND 100),
 reserved_cents integer NOT NULL CHECK (reserved_cents >= 0 AND reserved_cents <= cap_cents),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
 enabled boolean NOT NULL DEFAULT true
);
ALTER TABLE coffee_lab_ai_budget ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON coffee_lab_ai_budget FROM PUBLIC;
-- 8 cents reserved locally before handoff; never reset on redeploy.
INSERT INTO coffee_lab_ai_budget(id,cap_cents,reserved_cents,attempts)
VALUES ('launch-20261028',100,8,4) ON CONFLICT (id) DO NOTHING;
