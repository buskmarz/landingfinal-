CREATE TABLE freak_code_reissues (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 campaign text NOT NULL,
 person uuid NOT NULL,
 admin text NOT NULL,
 old_code_hash text NOT NULL,
 new_code_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(campaign,person) REFERENCES freak_physical_validations(campaign,person)
);
