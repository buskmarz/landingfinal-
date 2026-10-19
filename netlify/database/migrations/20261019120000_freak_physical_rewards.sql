CREATE TABLE freak_physical_validations (
 campaign text NOT NULL REFERENCES freak_campaigns(id), person uuid NOT NULL REFERENCES freak_people(id),
 normal_count integer NOT NULL CHECK(normal_count BETWEEN 0 AND 5000),special_count integer NOT NULL CHECK(special_count BETWEEN 0 AND 5000),
 code_hash text NOT NULL UNIQUE, admin text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(campaign,person), CHECK(normal_count+special_count*2>=10)
);
CREATE TABLE freak_rewards (
 campaign text NOT NULL REFERENCES freak_campaigns(id),id text NOT NULL,title text NOT NULL,poster_hash text NOT NULL UNIQUE,
 owner uuid REFERENCES freak_people(id),claimed_at timestamptz,delivered_at timestamptz,
 PRIMARY KEY(campaign,id),UNIQUE(campaign,owner),CHECK((owner IS NULL)=(claimed_at IS NULL))
);
INSERT INTO freak_rewards(campaign,id,title,poster_hash) VALUES('freak-2026','1','1 americano diario durante 2026','16274ee24f81c23d8293ece1f3b14ac72a5157caf8f40b3041d6a34f672d1235');
INSERT INTO freak_rewards(campaign,id,title,poster_hash) VALUES('freak-2026','2','1 vape','bfde71185726d36b1bce4856215031ec7df2c528a6c6840208045a4f9c790f26');
INSERT INTO freak_rewards(campaign,id,title,poster_hash) VALUES('freak-2026','3','2 Tugo y 2 gomitas · Kit Necte','4baac5a728a63d41c2288b032bc8c36e0689682e4bb623ee88e99c47b1cf948d');
INSERT INTO freak_rewards(campaign,id,title,poster_hash) VALUES('freak-2026','4','5 chilaquiles','8d0ef3aa15c15bac12495fd1779eb96d94f12dc319dcd1ab8012af86cb114eea');
INSERT INTO freak_rewards(campaign,id,title,poster_hash) VALUES('freak-2026','5','Hongo maitake Commons','0cc6f16eff0a6390697609c177f691071e892ec34290c7a937152577f890495b');
