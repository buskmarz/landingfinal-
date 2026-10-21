import {createHash,randomBytes} from 'node:crypto';
import {normalizePhone,normalizeName} from './freak-phone.mjs';
import {analyticsFilters,decodeAnalyticsCursor,analyticsPage,analyticsTimezone} from './freak-analytics.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status,code:'rewards'})};
export async function rewardsAction({req,op,body,q,db,campaign,person,json,admin}){
 const write=req.method==='POST';
 if(op==='rewards'&&!write){
 const prizes=(await q('SELECT id,title,owner IS NOT NULL AS taken FROM freak_rewards WHERE campaign=$1 ORDER BY id',[campaign])).rows;
 const mine=person?(await q('SELECT id,title,claimed_at,delivered_at FROM freak_rewards WHERE campaign=$1 AND owner=$2',[campaign,person.id])).rows[0]:null;
 const validation=person?(await q('SELECT normal_count+2*special_count AS points FROM freak_physical_validations WHERE campaign=$1 AND person=$2',[campaign,person.id])).rows[0]||null:null;
 const reservation=person?(await q('SELECT poster_id,created_at FROM freak_poster_reservations WHERE campaign=$1 AND person=$2',[campaign,person.id])).rows[0]||null:null;
 const availability=(await q('SELECT count(*)::int AS total,count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM freak_poster_reservations s WHERE s.campaign=r.campaign AND s.poster_id=r.id))::int AS available FROM freak_rewards r WHERE campaign=$1',[campaign])).rows[0];
 const token=req.headers.get('x-freak-poster')||'';
 const poster=/^[A-Za-z0-9_-]{43}$/.test(token)?(await q('SELECT r.id,EXISTS(SELECT 1 FROM freak_poster_reservations s WHERE s.campaign=r.campaign AND s.poster_id=r.id) AS occupied FROM freak_rewards r WHERE campaign=$1 AND poster_hash=$2',[campaign,hash(token)])).rows[0]||null:null;
 return json({prizes,mine,validation,reservation,availability,poster,person:person?{name:person.display_name}:null});
 }
 if(op==='poster-visit'&&write){
 if(typeof body.poster!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.poster)||typeof body.visit!=='string'||!/^([a-f0-9]{8}-)([a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(body.visit))fail(400,'Visita inválida.');
 await q('INSERT INTO freak_poster_visits(campaign,poster_id,visit) SELECT campaign,id,$3::uuid FROM freak_rewards WHERE campaign=$1 AND poster_hash=$2 ON CONFLICT DO NOTHING',[campaign,hash(body.poster),body.visit]);
 if(typeof body.event==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.event))await q('INSERT INTO freak_poster_open_events(id,campaign,poster_id,visit,occupied) SELECT $3::uuid,campaign,id,$4::uuid,EXISTS(SELECT 1 FROM freak_poster_reservations s WHERE s.campaign=r.campaign AND s.poster_id=r.id) FROM freak_rewards r WHERE campaign=$1 AND poster_hash=$2 ON CONFLICT DO NOTHING',[campaign,hash(body.poster),body.event,body.visit]);
 const found=(await q('SELECT r.id,EXISTS(SELECT 1 FROM freak_poster_reservations s WHERE s.campaign=r.campaign AND s.poster_id=r.id) AS occupied FROM freak_rewards r WHERE campaign=$1 AND poster_hash=$2',[campaign,hash(body.poster)])).rows[0];
 return json({ok:true,poster:found||null});
 }
 if(op==='reserve-poster'&&write){
 if(!person)fail(401,'Registra tu celular para guardar el QR.');
 if(typeof body.poster!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.poster))fail(400,'Escanea un QR válido.');
 let foundId=null,outcome='error';
 const audit=async result=>{if(foundId)try{await client.query('INSERT INTO freak_poster_save_events(campaign,poster_id,person,outcome) VALUES($1,$2,$3,$4)',[campaign,foundId,person.id,result]);}catch{}};
 const client=await db.pool.connect();
 try{await client.query('BEGIN');
 await client.query('SELECT id FROM freak_people WHERE id=$1 FOR UPDATE',[person.id]);
 const found=(await client.query('SELECT id FROM freak_rewards WHERE campaign=$1 AND poster_hash=$2',[campaign,hash(body.poster)])).rows[0];
 if(!found)fail(400,'Este QR no es válido.');foundId=found.id;
 const existing=(await client.query('SELECT poster_id FROM freak_poster_reservations WHERE campaign=$1 AND person=$2',[campaign,person.id])).rows[0];
 if(existing){if(existing.poster_id!==found.id){outcome='other_qr';fail(409,'Ya tienes un QR guardado.');}await client.query('COMMIT');await audit('already_saved');return json({ok:true});}
 const saved=await client.query('INSERT INTO freak_poster_reservations(campaign,poster_id,person) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING poster_id',[campaign,found.id,person.id]);
 if(!saved.rowCount){outcome='occupied';fail(409,'Este QR ya fue guardado por otra persona.');}
 await client.query('COMMIT');await audit('saved');return json({ok:true});
 }catch(e){await client.query('ROLLBACK');await audit(outcome);throw e}finally{client.release();}
 }
 if(op==='reward-claim'&&write){
 if(!person)fail(401,'Entra con tu celular.');
 if(typeof body.id!=='string'||!/^\d$/.test(body.id))fail(400,'Elige un premio disponible.');
 const client=await db.pool.connect();
 try{await client.query('BEGIN');
 await client.query('SELECT id FROM freak_people WHERE id=$1 FOR UPDATE',[person.id]);
 const previous=(await client.query('SELECT id,title FROM freak_rewards WHERE campaign=$1 AND owner=$2',[campaign,person.id])).rows[0];
 if(previous){if(previous.id!==body.id)fail(409,'Ya elegiste un premio.');await client.query('COMMIT');return json({ok:true,prize:previous});}
 const reserved=(await client.query('SELECT poster_id FROM freak_poster_reservations WHERE campaign=$1 AND person=$2',[campaign,person.id])).rows[0];
 if(!reserved)fail(403,'Guarda primero uno de los cinco QR.');
 const v=(await client.query('SELECT person FROM freak_physical_validations WHERE campaign=$1 AND person=$2 AND normal_count+2*special_count>=10',[campaign,person.id])).rows[0];
 if(!v)fail(403,'Trae tus stickers físicos: el equipo debe validar 10 puntos.');
 const won=(await client.query('UPDATE freak_rewards SET owner=$1,claimed_at=clock_timestamp() WHERE campaign=$2 AND id=$3 AND owner IS NULL RETURNING id,title',[person.id,campaign,body.id])).rows[0];
 if(!won)fail(409,'Alguien eligió ese premio. Puedes escoger otro disponible.');
 await client.query('COMMIT');return json({ok:true,prize:won});
 }catch(e){await client.query('ROLLBACK');if(e.code==='23505')fail(409,'Ya elegiste un premio. Actualiza para verlo.');throw e}finally{client.release();}
 }
 if(!admin)fail(401,'Entra a administración.');
 if(op==='admin-rewards'&&!write){
 const prizes=(await q('SELECT r.id,r.title,r.claimed_at,r.delivered_at,p.display_name,p.phone FROM freak_rewards r LEFT JOIN freak_people p ON p.id=r.owner WHERE r.campaign=$1 ORDER BY r.id',[campaign])).rows;
 const validations=(await q('SELECT v.normal_count,v.special_count,v.created_at,p.display_name,p.phone,EXISTS(SELECT 1 FROM freak_rewards r WHERE r.campaign=v.campaign AND r.owner=v.person) AS has_prize FROM freak_physical_validations v JOIN freak_people p ON p.id=v.person WHERE v.campaign=$1 ORDER BY v.created_at DESC',[campaign])).rows;
 const reservations=(await q('SELECT r.poster_id,r.created_at,p.display_name,p.phone FROM freak_poster_reservations r JOIN freak_people p ON p.id=r.person WHERE r.campaign=$1 ORDER BY r.created_at',[campaign])).rows;
 const posters=(await q(`SELECT r.id,COALESCE(l.label,'') AS location,(SELECT count(*)::int FROM freak_poster_open_events e WHERE e.campaign=r.campaign AND e.poster_id=r.id) AS opens,(SELECT count(*)::int FROM freak_poster_save_events e WHERE e.campaign=r.campaign AND e.poster_id=r.id) AS attempts,(SELECT count(*)::int FROM freak_poster_save_events e WHERE e.campaign=r.campaign AND e.poster_id=r.id AND e.outcome='occupied') AS occupied_attempts,EXISTS(SELECT 1 FROM freak_physical_validations v WHERE v.campaign=r.campaign AND v.person=s.person) AS validated,EXISTS(SELECT 1 FROM freak_rewards w WHERE w.campaign=r.campaign AND w.owner=s.person) AS claimed,EXISTS(SELECT 1 FROM freak_rewards w WHERE w.campaign=r.campaign AND w.owner=s.person AND w.delivered_at IS NOT NULL) AS delivered,(SELECT count(*)::int FROM freak_poster_visits v WHERE v.campaign=r.campaign AND v.poster_id=r.id) AS scans,p.display_name,p.phone,s.created_at AS saved_at FROM freak_rewards r LEFT JOIN freak_poster_locations l ON l.campaign=r.campaign AND l.poster_id=r.id LEFT JOIN freak_poster_reservations s ON s.campaign=r.campaign AND s.poster_id=r.id LEFT JOIN freak_people p ON p.id=s.person WHERE r.campaign=$1 ORDER BY r.id`,[campaign])).rows;
 const daily=(await q(`SELECT (created_at AT TIME ZONE 'America/Mexico_City')::date::text AS day,poster_id,count(*)::int AS opens,count(DISTINCT visit)::int AS sessions FROM freak_poster_open_events WHERE campaign=$1 GROUP BY 1,2 ORDER BY 1 DESC,2 LIMIT 150`,[campaign])).rows;
 const hourly=(await q(`SELECT extract(hour FROM created_at AT TIME ZONE 'America/Mexico_City')::int AS hour,count(*)::int AS opens FROM freak_poster_open_events WHERE campaign=$1 GROUP BY 1 ORDER BY 1`,[campaign])).rows;
 const totals={opens:posters.reduce((n,p)=>n+p.opens,0),sessions:posters.reduce((n,p)=>n+p.scans,0),saved:reservations.length,attempts:posters.reduce((n,p)=>n+p.attempts,0),occupied:posters.reduce((n,p)=>n+p.occupied_attempts,0),validated:posters.filter(p=>p.validated).length,claimed:posters.filter(p=>p.claimed).length,delivered:posters.filter(p=>p.delivered).length};
 return json({prizes,validations,reservations,posters,analytics:{totals,daily,hourly,timezone:'America/Mexico_City'}});
 }
 if(op==='admin-scan-history'&&!write){
 const {p,from,to,snapshot:givenSnapshot}=analyticsFilters(req),poster=p.get('poster')||null,legacyBefore=p.get('before')||null;
 if(poster&&!/^\d$/.test(poster))fail(400,'QR inválido.');
 if(legacyBefore&&!Number.isFinite(Date.parse(legacyBefore)))fail(400,'Fecha inválida.');
 const cursor=decodeAnalyticsCursor(p.get('cursor'));
 const snapshot=givenSnapshot||(await q('SELECT clock_timestamp()::text AS cutoff')).rows[0].cutoff;
 const events=(await q(`SELECT e.id,e.poster_id,e.created_at::text AS created_at,e.visit,e.occupied,COALESCE(l.label,'') AS location FROM freak_poster_open_events e LEFT JOIN freak_poster_locations l ON l.campaign=e.campaign AND l.poster_id=e.poster_id WHERE e.campaign=$1 AND ($2::text IS NULL OR e.poster_id=$2) AND ($3::date IS NULL OR e.created_at>=($3::date::timestamp AT TIME ZONE 'America/Mexico_City')) AND ($4::date IS NULL OR e.created_at<(($4::date+1)::timestamp AT TIME ZONE 'America/Mexico_City')) AND e.created_at<=$5::timestamptz AND ($6::timestamptz IS NULL OR (e.created_at,e.id)<($6::timestamptz,$7::uuid)) AND ($8::timestamptz IS NULL OR e.created_at<$8::timestamptz) ORDER BY e.created_at DESC,e.id DESC LIMIT 201`,[campaign,poster,from,to,snapshot,cursor?.[0]||null,cursor?.[1]||null,legacyBefore])).rows;
 const page=analyticsPage(events);
 // Keep the legacy timestamp field while new clients use the precise compound cursor.
 return json({...page,nextCursor:page.next,next:page.next?events.at(-1).created_at:null,snapshot,filters:{poster,from,to},timezone:analyticsTimezone});
 }
 if(op==='admin-poster-location'&&write){
 if(typeof body.id!=='string'||!/^\d$/.test(body.id)||typeof body.location!=='string'||body.location.trim().length>240)fail(400,'Revisa el QR y la ubicación.');
 const result=await q('INSERT INTO freak_poster_locations(campaign,poster_id,label) SELECT campaign,id,$3 FROM freak_rewards WHERE campaign=$1 AND id=$2 ON CONFLICT(campaign,poster_id) DO UPDATE SET label=EXCLUDED.label,updated_at=clock_timestamp() RETURNING poster_id',[campaign,body.id,body.location.trim()]);if(!result.rowCount)fail(404,'QR no encontrado.');return json({ok:true});
 }
 if(op==='admin-validate-points'&&write){
 const phone=normalizePhone(body.phone),name=normalizeName(body.name);
 if(!phone||!name||!Number.isInteger(body.normal)||!Number.isInteger(body.special)||body.normal<0||body.special<0||body.normal>5000||body.special>5000||body.normal+2*body.special<10||body.marked!==true)fail(400,'Revisa nombre, celular, 10 puntos y marca los stickers físicos como contados.');
 const code=randomBytes(6).toString('hex').toUpperCase();
 const result=await q(`INSERT INTO freak_physical_validations(campaign,person,normal_count,special_count,code_hash,admin) SELECT $1,id,$3,$4,$5,$6 FROM freak_people WHERE campaign=$1 AND phone=$2 AND display_name=$7 ON CONFLICT(campaign,person) DO NOTHING RETURNING person`,[campaign,phone,body.normal,body.special,hash(code),admin.admin,name]);
 if(!result.rowCount)fail(409,'La persona debe registrarse primero. Revisa nombre y celular; si ya fue validada, puedes reemitir su código en Personas validadas.');
 return json({ok:true,code,points:body.normal+2*body.special});
 }
 if(op==='admin-reissue-code'&&write){
 const phone=normalizePhone(body.phone),name=normalizeName(body.name);
 if(!phone||!name||body.confirmed!==true)fail(400,'Confirma nombre, celular y reemisión. El código anterior dejará de funcionar.');
 const client=await db.pool.connect();
 try{await client.query('BEGIN');
 const owner=(await client.query('SELECT id FROM freak_people WHERE campaign=$1 AND phone=$2 AND display_name=$3 FOR UPDATE',[campaign,phone,name])).rows[0];
 if(!owner)fail(404,'No encontramos esa cuenta. Revisa nombre y celular.');
 const previous=(await client.query('SELECT id FROM freak_rewards WHERE campaign=$1 AND owner=$2',[campaign,owner.id])).rows[0];
 if(previous)fail(409,'Ya confirmó un premio. No se puede reemitir el código.');
 const validation=(await client.query('SELECT code_hash,normal_count+2*special_count AS points FROM freak_physical_validations WHERE campaign=$1 AND person=$2 FOR UPDATE',[campaign,owner.id])).rows[0];
 if(!validation||validation.points<10)fail(409,'Primero valida sus 10 puntos en barra.');
 const code=randomBytes(6).toString('hex').toUpperCase(),nextHash=hash(code);
 const updated=await client.query('UPDATE freak_physical_validations SET code_hash=$1 WHERE campaign=$2 AND person=$3 AND code_hash=$4 RETURNING person',[nextHash,campaign,owner.id,validation.code_hash]);
 if(!updated.rowCount)fail(409,'El código cambió. Actualiza antes de reemitirlo.');
 await client.query('INSERT INTO freak_code_reissues(campaign,person,admin,old_code_hash,new_code_hash) VALUES($1,$2,$3,$4,$5)',[campaign,owner.id,admin.admin,validation.code_hash,nextHash]);
 await client.query('COMMIT');return json({ok:true,code,points:validation.points});
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release();}
 }
 if(op==='admin-deliver-reward'&&write){
 if(typeof body.id!=='string')fail(400,'Premio inválido.');
 const result=await q('UPDATE freak_rewards SET delivered_at=clock_timestamp() WHERE campaign=$1 AND id=$2 AND owner IS NOT NULL AND delivered_at IS NULL RETURNING id',[campaign,body.id]);
 if(!result.rowCount)fail(409,'Ese premio no está pendiente de entrega.');return json({ok:true});
 }
 fail(404,'Acción no encontrada.');
}
