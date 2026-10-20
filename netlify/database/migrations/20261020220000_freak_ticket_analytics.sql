CREATE TABLE IF NOT EXISTS freak_ticket_open_events (
 id uuid PRIMARY KEY,
 campaign text NOT NULL REFERENCES freak_campaigns(id),
 visitor uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS freak_ticket_events_time ON freak_ticket_open_events(campaign,created_at DESC,id DESC);
