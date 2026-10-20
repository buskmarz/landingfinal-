ALTER TABLE freak_poster_open_events ADD COLUMN occupied boolean;
-- NULL preserves unknown historical state; new openings record availability at receipt.
