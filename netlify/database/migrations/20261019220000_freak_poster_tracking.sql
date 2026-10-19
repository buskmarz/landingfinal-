CREATE TABLE freak_poster_locations (
 campaign text NOT NULL,poster_id text NOT NULL,label text NOT NULL CHECK(length(label)<=240),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(campaign,poster_id),FOREIGN KEY(campaign,poster_id) REFERENCES freak_rewards(campaign,id)
);
CREATE TABLE freak_poster_visits (
 campaign text NOT NULL,poster_id text NOT NULL,visit uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(campaign,poster_id,visit),FOREIGN KEY(campaign,poster_id) REFERENCES freak_rewards(campaign,id)
);
