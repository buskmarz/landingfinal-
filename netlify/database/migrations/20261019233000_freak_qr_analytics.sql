CREATE TABLE freak_poster_open_events (
 id uuid PRIMARY KEY,campaign text NOT NULL,poster_id text NOT NULL,visit uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(campaign,poster_id) REFERENCES freak_rewards(campaign,id)
);
CREATE INDEX freak_poster_open_dates ON freak_poster_open_events(campaign,created_at);
CREATE TABLE freak_poster_save_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,campaign text NOT NULL,poster_id text NOT NULL,person uuid REFERENCES freak_people(id),outcome text NOT NULL CHECK(outcome IN ('saved','already_saved','occupied','other_qr','error')),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(campaign,poster_id) REFERENCES freak_rewards(campaign,id)
);
CREATE INDEX freak_poster_save_dates ON freak_poster_save_events(campaign,created_at);
