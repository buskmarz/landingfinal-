-- Preserve all previously recorded ticket openings; new links may identify their source.
ALTER TABLE freak_ticket_open_events ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'boleto';
ALTER TABLE freak_ticket_open_events ADD CONSTRAINT freak_ticket_event_source CHECK (source IN ('boleto','anuncio','general'));
CREATE INDEX IF NOT EXISTS freak_ticket_events_source_time ON freak_ticket_open_events(campaign,source,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS freak_poster_events_time_id ON freak_poster_open_events(campaign,created_at DESC,id DESC);
