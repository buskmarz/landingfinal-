CREATE TABLE freak_campaigns (
 id text PRIMARY KEY CHECK (id IN ('prueba','freak-2026')),
 active boolean NOT NULL DEFAULT false,
 title text NOT NULL,
 event_at timestamptz NOT NULL DEFAULT '2026-10-28 00:00:00-06',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE freak_people (
 id uuid PRIMARY KEY,
 campaign text NOT NULL REFERENCES freak_campaigns(id),
 alias text NOT NULL,
 alias_key text NOT NULL,
 salt text NOT NULL,
 recovery_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(campaign, alias_key), UNIQUE(campaign,id)
);
CREATE TABLE freak_sessions (
 token_hash text PRIMARY KEY,
 person uuid NOT NULL REFERENCES freak_people(id),
 expires_at timestamptz NOT NULL
);
CREATE INDEX freak_sessions_expiry ON freak_sessions(expires_at);
CREATE TABLE freak_tickets (
 campaign text NOT NULL REFERENCES freak_campaigns(id),
 number integer NOT NULL CHECK (number BETWEEN 1 AND 100),
 token_hash text NOT NULL UNIQUE,
 act integer NOT NULL CHECK (act BETWEEN 0 AND 3),
 rare boolean NOT NULL,
 variant text,
 release_at timestamptz NOT NULL,
 owner uuid,
 claimed_at timestamptz,
 PRIMARY KEY(campaign,number),
 FOREIGN KEY(campaign,owner) REFERENCES freak_people(campaign,id),
 CHECK ((owner IS NULL) = (claimed_at IS NULL))
);
CREATE INDEX freak_tickets_owner ON freak_tickets(campaign,owner);
CREATE TABLE freak_rate (
 key text NOT NULL,
 bucket bigint NOT NULL,
 hits integer NOT NULL,
 PRIMARY KEY(key,bucket)
);
INSERT INTO freak_campaigns(id,active,title) VALUES
 ('prueba',true,'Ensayo de la colección imposible'),
 ('freak-2026',false,'FREAK · La colección imposible');
