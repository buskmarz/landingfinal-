-- Product confirmed by the owner: BIOVIKOTING B0GMMG3K62, non-electric air diffuser,
-- no tobacco or nicotine. Only the display title changes; printed token hashes stay intact.
INSERT INTO freak_reset_audit(campaign,number,admin,snapshot)
SELECT campaign,NULL,'owner',jsonb_build_object('scope','prize-title-change','reward_id',id,'previous_title',title,'new_title','Vaporizador')
FROM freak_rewards WHERE campaign='freak-2026' AND id='2' AND title='1 vape';
UPDATE freak_rewards SET title='Vaporizador'
WHERE campaign='freak-2026' AND id='2' AND title='1 vape';
