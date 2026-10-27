ALTER TABLE freak_rewards ADD COLUMN reserved_for uuid REFERENCES freak_people(id);
ALTER TABLE freak_rewards ADD COLUMN reserved_at timestamptz;
ALTER TABLE freak_rewards ADD COLUMN reserved_by text REFERENCES freak_admins(id);
ALTER TABLE freak_rewards ADD CONSTRAINT freak_reward_reservation_consistent CHECK ((reserved_for IS NULL)=(reserved_at IS NULL) AND (reserved_for IS NULL)=(reserved_by IS NULL));
CREATE UNIQUE INDEX freak_one_reserved_prize ON freak_rewards(campaign,reserved_for);
