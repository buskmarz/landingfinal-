import {reservePrize} from './freak-prize-reservation.mjs';
import {resetPosterTest} from './freak-poster-reset.mjs';
import {resetPersonPin} from './freak-pin.mjs';
import {ticketAnalytics} from './freak-ticket-analytics.mjs';
import {rewardsAction} from './freak-rewards.mjs';
import {normalizePhone,normalizeName} from './freak-phone.mjs';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {series} from '../../freak/catalog.mjs';
const resetKey=t=>createHash('sha256').update(JSON.stringify([t.owner,t.claimed_at,t.received_at,t.version||0])).digest('hex');
const hash=v=>createHash('sha256').update(v).digest('hex');
const cookie='__Secure-freak-admin';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status,code:'admin'})};
const sessionCookie=(token,age=28800)=>`${cookie}=${token}; Path=/api/freak; Max-Age=${age}; Secure; HttpOnly; SameSite=Strict`;
export async function adminAction({req,op,body,q,db,campaign,json}){
 const write=req.method==='POST';
 const raw=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookie+'='))?.slice(cookie.length+1);
 if(op==='admin-login'){
 if(!write)fail(405,'Usa el formulario de acceso.');
 const key=typeof body.key==='string'?body.key:'';
 if(key.length!==43)fail(401,'Clave administrativa incorrecta.');
 const admin=(await q('SELECT id,key_hash FROM freak_admins WHERE id=$1',['owner'])).rows[0];
 if(!admin||!timingSafeEqual(Buffer.from(hash(key),'hex'),Buffer.from(admin.key_hash,'hex')))fail(401,'Clave administrativa incorrecta.');
 const token=randomBytes(32).toString('base64url');
 await q("INSERT INTO freak_admin_sessions(token_hash,admin,expires_at) VALUES($1,$2,now()+interval '8 hours')",[hash(token),admin.id]);
 return json({ok:true},200,{'Set-Cookie':sessionCookie(token)});
 }
 const admin=raw&&/^[A-Za-z0-9_-]{43}$/.test(raw)?(await q('SELECT admin FROM freak_admin_sessions WHERE token_hash=$1 AND expires_at>now()',[hash(raw)])).rows[0]:null;
 if(!admin)fail(401,'Entra con tu clave de administración.');
 if(op==='admin-reserve-prize')return await reservePrize({req,body,db,campaign,admin,json});
 if(op==='admin-reset-poster-test')return await resetPosterTest({req,body,db,campaign,admin,json});
 if(op==='admin-reset-prize-tests'){
 if(!write)fail(405,'Usa el formulario de reinicio.');
 if(body.confirm!==`REINICIAR PREMIOS ${campaign}`)fail(400,'Confirma el reinicio exclusivo de premios.');
 const client=await db.pool.connect();
 try{
 await client.query('BEGIN');
 await client.query('LOCK TABLE freak_rewards,freak_poster_reservations,freak_poster_visits,freak_poster_open_events,freak_poster_save_events IN ACCESS EXCLUSIVE MODE');
 const snapshot={scope:'prize-qr-tests',rewards:(await client.query('SELECT * FROM freak_rewards WHERE campaign=$1 ORDER BY id',[campaign])).rows};
 for(const table of ['freak_poster_reservations','freak_poster_visits','freak_poster_open_events','freak_poster_save_events'])snapshot[table]=(await client.query('SELECT * FROM '+table+' WHERE campaign=$1',[campaign])).rows;
 if(snapshot.rewards.some(r=>r.owner||r.reserved_for||r.delivered_at))fail(409,'Hay premios confirmados. Revisa antes de reiniciar.');
 await client.query('INSERT INTO freak_reset_audit(campaign,number,admin,snapshot) VALUES($1,NULL,$2,$3)',[campaign,admin.admin,JSON.stringify(snapshot)]);
 for(const table of ['freak_poster_save_events','freak_poster_open_events','freak_poster_visits','freak_poster_reservations'])await client.query('DELETE FROM '+table+' WHERE campaign=$1',[campaign]);
 await client.query('COMMIT');return json({ok:true,scope:'prize-qr-tests',qr:snapshot.rewards.length,archivedOpens:snapshot.freak_poster_open_events.length});
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }
 if(op==='admin-reset-pin')return await resetPersonPin({req,body,db,campaign,admin,json});
 if(op==='admin-ticket-analytics'&&req.method==='GET')return await ticketAnalytics({req,body,q,campaign,json,admin});
 if(['admin-scan-history','admin-rewards','admin-validate-points','admin-deliver-reward','admin-reissue-code','admin-poster-location'].includes(op))return await rewardsAction({req,op,body,q,db,campaign,json,admin});
 if(op==='admin-logout'&&write){await q('DELETE FROM freak_admin_sessions WHERE token_hash=$1',[hash(raw)]);return json({ok:true},200,{'Set-Cookie':sessionCookie('',0)})}
 if(op==='admin-lookup'&&write){
 if(typeof body.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.token))fail(400,'Enlace inválido.');
 const t=(await q('SELECT number FROM freak_tickets WHERE campaign=$1 AND token_hash=$2',[campaign,hash(body.token)])).rows[0];
 if(!t)fail(404,'El QR no pertenece a esta campaña.');return json(t);
 }
 if(op==='admin-list'&&!write){
 const rows=(await q(`SELECT t.number,t.owner,t.display_number,t.short_code,t.act,t.rare,t.release_at,t.claimed_at,t.received_at,t.received_alias,t.received_phone,t.received_name,t.found_latitude,t.found_longitude,t.found_accuracy,p.alias,p.phone,p.display_name,
 l.place,l.reference,l.latitude,l.longitude,l.accuracy,l.physical,l.version,l.updated_at,
 COALESCE(v.opens,0)::int AS opens,v.first_open,v.last_open
 FROM freak_tickets t LEFT JOIN freak_people p ON p.id=t.owner
 LEFT JOIN freak_locations l ON l.campaign=t.campaign AND l.number=t.number
 LEFT JOIN (SELECT campaign,number,count(*) AS opens,min(created_at) AS first_open,max(created_at) AS last_open FROM freak_visits GROUP BY campaign,number) v ON v.campaign=t.campaign AND v.number=t.number
 WHERE t.campaign=$1 ORDER BY t.display_number NULLS LAST,t.number`,[campaign])).rows.map(t=>({...t,resetKey:resetKey(t),name:series[t.act].name,physical:t.physical||'unplaced',version:t.version||0}));
 const history=(await q('SELECT number,snapshot,created_at FROM freak_location_history WHERE campaign=$1 ORDER BY id DESC LIMIT 300',[campaign])).rows;
 const people=(await q('SELECT p.alias,p.phone,p.display_name,p.created_at,count(t.number)::int AS stickers FROM freak_people p LEFT JOIN freak_tickets t ON t.owner=p.id AND t.campaign=p.campaign WHERE p.campaign=$1 GROUP BY p.id ORDER BY p.created_at DESC',[campaign])).rows;
 const config=(await q('SELECT id,active,public_hint,hint_version FROM freak_campaigns WHERE id=$1',[campaign])).rows[0];return json({tickets:rows,history,people,campaign:config});
 }
 if(['admin-unlink','admin-reset-campaign'].includes(op)&&write){
 const all=op==='admin-reset-campaign';
 if(all?body.confirm!==`REINICIAR ${campaign}`:!Number.isInteger(body.number)||body.number<1||body.number>100||typeof body.resetKey!=='string')fail(400,'Confirma el reinicio solicitado.');
 const client=await db.pool.connect();
 try{await client.query('BEGIN');
 if(all)await client.query('LOCK TABLE freak_people,freak_tickets IN ACCESS EXCLUSIVE MODE');
 const tickets=(await client.query('SELECT * FROM freak_tickets WHERE campaign=$1'+(all?'':' AND number=$2')+' ORDER BY number FOR UPDATE',all?[campaign]:[campaign,body.number])).rows;
 if(!tickets.length)fail(404,'Sticker no encontrado.');
 const filter=' WHERE campaign=$1'+(all?'':' AND number=$2'),args=all?[campaign]:[campaign,body.number];
 const snapshot={tickets};
 for(const table of ['freak_locations','freak_visits','freak_location_history','freak_receipt_history'])snapshot[table]=(await client.query('SELECT * FROM '+table+filter,args)).rows;
 if(!all){const version=snapshot.freak_locations[0]?.version||0;if(resetKey({...tickets[0],version})!==body.resetKey)fail(409,'Este sticker cambió. Actualiza antes de desvincular.');}
 if(all){snapshot.people=(await client.query('SELECT * FROM freak_people WHERE campaign=$1',[campaign])).rows;snapshot.campaign=(await client.query('SELECT * FROM freak_campaigns WHERE id=$1',[campaign])).rows[0];}
 await client.query('INSERT INTO freak_reset_audit(campaign,number,admin,snapshot) VALUES($1,$2,$3,$4)',[campaign,all?null:body.number,admin.admin,JSON.stringify(snapshot)]);
 await client.query('UPDATE freak_tickets SET owner=NULL,claimed_at=NULL,received_at=NULL,received_alias=NULL,received_phone=NULL,received_name=NULL,found_latitude=NULL,found_longitude=NULL,found_accuracy=NULL'+filter,args);
 for(const table of ['freak_locations','freak_visits','freak_location_history','freak_receipt_history'])await client.query('DELETE FROM '+table+filter,args);
 if(all){await client.query('DELETE FROM freak_sessions WHERE person IN (SELECT id FROM freak_people WHERE campaign=$1)',[campaign]);await client.query('DELETE FROM freak_people WHERE campaign=$1',[campaign]);await client.query("UPDATE freak_campaigns SET public_hint='',hint_updated_at=NULL,hint_version=hint_version+1 WHERE id=$1",[campaign]);}
 await client.query('COMMIT');return json({ok:true,reset:tickets.length});
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }
 if(op==='admin-hint'&&write){
 const hint=typeof body.hint==='string'?body.hint.trim():'';
 if(hint.length>180||!Number.isInteger(body.version))fail(400,'Usa una pista de hasta 180 caracteres.');
 const result=await q('UPDATE freak_campaigns SET public_hint=$1,hint_updated_at=now(),hint_version=hint_version+1 WHERE id=$2 AND hint_version=$3 RETURNING id',[hint,campaign,body.version]);
 if(!result.rowCount)fail(409,'La pista cambió en otro dispositivo. Actualiza antes de guardar.');
 return json({ok:true});
 }
 if(op==='admin-receive'&&write){
 const code=typeof body.code==='string'?body.code.trim().toUpperCase():'';
 const phone=normalizePhone(body.phone);
 if(!phone)fail(400,'Escribe el celular de 10 dígitos.');
 if(!/^[A-Z2-9]{4}$/.test(code))fail(400,'Escribe el código de 4 caracteres del sticker.');
 const client=await db.pool.connect();
 try{await client.query('BEGIN');
 const t=(await client.query('SELECT * FROM freak_tickets WHERE campaign=$1 AND short_code=$2 FOR UPDATE',[campaign,code])).rows[0];
 if(!t)fail(404,'Código no encontrado en esta colección.');
 if(t.received_at)fail(409,'Este sticker ya fue contado.');
 let receivedName=normalizeName(body.name);
 let verifiedAlias='Coleccionista presencial';
 if(t.owner){const owner=(await client.query('SELECT alias,alias_key,phone,display_name FROM freak_people WHERE id=$1',[t.owner])).rows[0];if(owner.phone!==phone)fail(409,`El QR pertenece a ${owner.display_name||owner.alias}. Verifica quién lo entrega antes de contar.`);verifiedAlias=owner.alias;receivedName=owner.display_name||receivedName;}
 if(phone&&!receivedName)fail(400,'Escribe el nombre de quien entrega el sticker.');
 await client.query('UPDATE freak_tickets SET received_at=now(),received_alias=$3,received_phone=$4,received_name=$5 WHERE campaign=$1 AND number=$2',[campaign,t.number,verifiedAlias,phone,receivedName]);
 await client.query('INSERT INTO freak_receipt_history(campaign,number,alias,admin) VALUES($1,$2,$3,$4)',[campaign,t.number,verifiedAlias,admin.admin]);
 await client.query('COMMIT');return json({ok:true,number:t.number,code,alias:verifiedAlias});
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }
 if(op==='admin-save'&&write){
 const {number,latitude,longitude,accuracy,version}=body;
 if(!Number.isInteger(number)||number<1||number>100||!Number.isInteger(version)||version<0)fail(400,'Selecciona un sticker válido.');
 const place=typeof body.place==='string'?body.place.trim():'',reference=typeof body.reference==='string'?body.reference.trim():'';
 if(place.length>120||reference.length>500||!['unplaced','placed','removed','missing'].includes(body.physical))fail(400,'Revisa los campos de ubicación.');
 const noCoords=latitude===null&&longitude===null;
 if(!noCoords&&(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180))fail(400,'Coordenadas inválidas.');
 if(accuracy!==null&&(!Number.isFinite(accuracy)||accuracy<0||accuracy>100000))fail(400,'Precisión inválida.');
 if(body.physical==='placed'&&(!place||noCoords||!reference))fail(400,'Para colocarlo registra lugar, referencia exacta y coordenadas.');
 const client=await db.pool.connect();
 try{await client.query('BEGIN');
 const t=(await client.query('SELECT number FROM freak_tickets WHERE campaign=$1 AND number=$2 FOR UPDATE',[campaign,number])).rows[0];if(!t)fail(404,'Sticker inexistente.');
 const old=(await client.query('SELECT version FROM freak_locations WHERE campaign=$1 AND number=$2',[campaign,number])).rows[0];
 if((old?.version||0)!==version)fail(409,'Otro dispositivo modificó este sticker. Actualiza antes de guardar.');
 const snapshot={place,reference,latitude,longitude,accuracy,physical:body.physical,version:version+1};
 await client.query(`INSERT INTO freak_locations(campaign,number,place,reference,latitude,longitude,accuracy,physical,version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
 ON CONFLICT(campaign,number) DO UPDATE SET place=$3,reference=$4,latitude=$5,longitude=$6,accuracy=$7,physical=$8,version=$9,updated_at=now()`,[campaign,number,place,reference,latitude,longitude,accuracy,body.physical,version+1]);
 await client.query('INSERT INTO freak_location_history(campaign,number,admin,snapshot) VALUES($1,$2,$3,$4)',[campaign,number,admin.admin,JSON.stringify(snapshot)]);
 await client.query('COMMIT');return json({ok:true});
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }
 fail(405,'Acción administrativa no permitida.');
}
