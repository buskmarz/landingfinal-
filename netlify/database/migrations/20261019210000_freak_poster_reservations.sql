CREATE TABLE freak_poster_reservations (
 campaign text NOT NULL REFERENCES freak_campaigns(id),
 poster_id text NOT NULL,
 person uuid NOT NULL REFERENCES freak_people(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(campaign,poster_id), UNIQUE(campaign,person),
 FOREIGN KEY(campaign,poster_id) REFERENCES freak_rewards(campaign,id)
);
