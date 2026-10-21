-- Add story attribution without modifying any previous event.
ALTER TABLE freak_ticket_open_events DROP CONSTRAINT freak_ticket_event_source;
ALTER TABLE freak_ticket_open_events ADD CONSTRAINT freak_ticket_event_source CHECK (source IN ('boleto','anuncio','general','instagram'));
