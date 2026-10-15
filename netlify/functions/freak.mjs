import {normalizePhone,normalizeName} from '../lib/freak-phone.mjs';
import {adminAction} from '../lib/freak-admin.mjs';
import {series} from '../../freak/catalog.mjs';
import { getDatabase } from '@netlify/database';
import { randomBytes, randomInt, randomUUID, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCallback);
const hash=v=>createHash('sha256').update(v).digest('hex');
const shortKey=()=>Array.from({length:4},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');
const cookieName='__Secure-freak';
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const error=(status,code,message)=>Object.assign(new Error(message),{status,code});
const ticket=t=>({number:t.number,displayNumber:t.display_number??t.number,code:t.short_code,act:t.act,name:series[t.act].name,description:series[t.act].description,edition:series[t.act].edition,rare:t.rare,variant:t.variant,claimedAt:t.claimed_at});
export function createHandler(database,now=()=>Date.now()){
return async function(req,context={}) {
 try {
 const url=new URL(req.url), op=url.searchParams.get('op')||'state', campaign=url.searchParams.get('camp')||'freak-2026';
 if(!['prueba','freak-2026'].includes(campaign))throw error(400,'invalid_campaign','Campaña inválida.');
 if(!['GET','POST'].includes(req.method)) return json({error:'Método no permitido'},405,{Allow:'GET, POST'});
 const db=database||getDatabase();
 const q=(sql,args=[])=>db.pool.query(sql,args);
 // The IP is supplied by Netlify, never by a caller-controlled forwarded header.
 const ip=context.ip||'unknown';
 const sensitive=req.method==='POST',bucket=Math.floor(now()/(sensitive?60000:60000));
 const rateKey=hash(`${ip}:${sensitive?'write':'read'}`), limit=sensitive?30:120;
 const rate=await q(`INSERT INTO freak_rate(key,bucket,hits) VALUES($1,$2,1) ON CONFLICT(key,bucket) DO UPDATE SET hits=freak_rate.hits+1 WHERE freak_rate.hits<$3 RETURNING hits`,[rateKey,bucket,limit]);
 if(!rate.rowCount) return json({code:'rate_limit',error:'Una pausa entre actos. Intenta de nuevo en un minuto.'},429,{'Retry-After':'60'});
 if(sensitive){
 const origin=req.headers.get('origin');
 if(origin!==url.origin)throw error(403,'origin','Recarga la página antes de continuar.');
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw error(415,'format','Se requiere JSON.');
 if(Number(req.headers.get('content-length')||0)>2048)throw error(413,'size','Solicitud demasiado larga.');
 }
 const config=(await q('SELECT id,active,title,public_hint,hint_updated_at FROM freak_campaigns WHERE id=$1',[campaign])).rows[0];
 if(!config)throw error(503,'not_ready','El circo está preparando sus puertas. Intenta más tarde.');
 const cookie=req.headers.get('cookie')||'', rawSession=cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 let person=null;
 if(rawSession&&/^[A-Za-z0-9_-]{43}$/.test(rawSession))person=(await q('SELECT p.id,p.alias,p.phone,p.display_name,p.recovery_length,p.short_recovery_hash IS NOT NULL AS has_short_key FROM freak_sessions s JOIN freak_people p ON p.id=s.person WHERE s.token_hash=$1 AND s.expires_at>now() AND p.campaign=$2',[hash(rawSession),campaign])).rows[0]||null;
 let body={};
 if(sensitive){const text=await req.text();if(text.length>2048)throw error(413,'size','Solicitud demasiado larga.');try{body=JSON.parse(text)}catch{throw error(400,'json','Solicitud inválida.')}if(!body||Array.isArray(body)||typeof body!=='object')throw error(400,'json','Solicitud inválida.');}
 if(op.startsWith('admin-'))return await adminAction({req,op,body,q,db,campaign,json});
 if(op==='visit'&&sensitive){
 if(typeof body.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.token)||typeof body.visit!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.visit))throw error(400,'visit','Registro inválido.');
 await q('INSERT INTO freak_visits(campaign,number,visit) SELECT campaign,number,$3 FROM freak_tickets WHERE campaign=$1 AND token_hash=$2 ON CONFLICT DO NOTHING',[campaign,hash(body.token),body.visit]);return json({ok:true});
 }
 if(op==='logout'&&sensitive){if(rawSession)await q('DELETE FROM freak_sessions WHERE token_hash=$1',[hash(rawSession)]);return json({ok:true},200,{'Set-Cookie':`${cookieName}=; Path=/api/freak; Max-Age=0; Secure; HttpOnly; SameSite=Strict`});}
 if(op==='short-access'&&sensitive){
 if(!person)throw error(401,'login','Entra a tu colección primero.');
 const recovery=shortKey(),salt=randomBytes(16).toString('hex'),derived=(await scrypt(recovery,salt,64)).toString('hex');
 const updated=await q('UPDATE freak_people SET short_recovery_hash=$1,short_recovery_salt=$2 WHERE id=$3 AND recovery_length<>4 AND short_recovery_hash IS NULL RETURNING id',[derived,salt,person.id]);
 if(!updated.rowCount)throw error(409,'already_short','Ya tienes una clave de cuatro caracteres.');
 return json({recovery});
 }
 if(op==='profile-name'&&sensitive){
 if(!person)throw error(401,'login','Entra a tu colección.');
 const name=normalizeName(body.name);if(!name)throw error(400,'name','Escribe tu nombre (2–60 caracteres).');
 await q('UPDATE freak_people SET display_name=$1 WHERE id=$2',[name,person.id]);return json({ok:true});
 }
 if(op==='link-phone'&&sensitive){
 if(!person)throw error(401,'login','Entra primero a tu colección.');
 const phone=normalizePhone(body.phone);if(!phone)throw error(400,'phone','Revisa tu teléfono: 10 dígitos en México o +código de país.');
 if(person.phone)throw error(409,'linked','Esta cuenta ya tiene teléfono.');
 try{const result=await q('UPDATE freak_people SET phone=$1 WHERE id=$2 AND phone IS NULL RETURNING id',[phone,person.id]);if(!result.rowCount)throw error(409,'linked','Esta cuenta ya tiene teléfono.');}
 catch(e){if(e.code==='23505')throw error(409,'phone_taken','Ese teléfono ya tiene una colección. Entra con su clave.');throw e;}
 return json({ok:true});
 }
 if(['register','login'].includes(op)&&sensitive){
 const phone=body.phone!==undefined?normalizePhone(body.phone):null;
 if(body.phone!==undefined&&!phone)throw error(400,'phone','Revisa tu teléfono: 10 dígitos en México o +código de país.');
 const generatedId=randomUUID();
 const alias=phone&&op==='register'?'Coleccionista '+generatedId.slice(0,8):typeof body.alias==='string'?body.alias.normalize('NFKC').trim().replace(/\s+/g,' '):'';
 if(!phone&&!/^[\p{L}\p{N} _-]{3,24}$/u.test(alias))throw error(400,'alias','Usa un alias de 3 a 24 letras o números.');
 const aliasKey=alias.toLocaleLowerCase('es-MX');let recovery;
 if(op==='register'){
 const name=phone?normalizeName(body.name):null;if(phone&&!name)throw error(400,'name','Escribe tu nombre (2–60 caracteres).');
 if(!config.active)throw error(423,'closed','La colección todavía no está abierta.');
 recovery=shortKey();const salt=randomBytes(16).toString('hex');
 const passwordHash=(await scrypt(recovery,salt,64)).toString('hex');
 const inserted=await q('INSERT INTO freak_people(id,campaign,alias,alias_key,salt,recovery_hash,recovery_length,phone,display_name) VALUES($1,$2,$3,$4,$5,$6,4,$7,$8) ON CONFLICT DO NOTHING RETURNING id,alias,phone,display_name',[generatedId,campaign,alias,aliasKey,salt,passwordHash,phone,name]);
 person=inserted.rows[0];if(!person)throw error(409,phone?'phone_taken':'alias_taken',phone?'Ese teléfono ya tiene una colección. Entra con tu clave.':'Ese alias ya tiene boleto. Elige otro o recupera tu acceso.');
 }else{
 let code=typeof body.recovery==='string'?body.recovery.trim():'';
 const p=(await q(phone?'SELECT * FROM freak_people WHERE campaign=$1 AND phone=$2':'SELECT * FROM freak_people WHERE campaign=$1 AND alias_key=$2',[campaign,phone||aliasKey])).rows[0];
 const gate=await q(`INSERT INTO freak_rate(key,bucket,hits) VALUES($1,$2,1) ON CONFLICT(key,bucket) DO UPDATE SET hits=freak_rate.hits+1 WHERE freak_rate.hits<5 RETURNING hits`,[hash(`login:${campaign}:${p?.id||phone||aliasKey}`),Math.floor(now()/900000)]);
 if(!gate.rowCount)throw error(429,'login_limit','Demasiados intentos para esta cuenta. Espera 15 minutos.');
 if(code.length===4)code=code.toUpperCase();
 if(code.length!==4&&(code.length<16||code.length>80))throw error(401,'credentials','Teléfono o clave incorrectos.');
 const useShort=code.length===4&&p?.short_recovery_hash;
 const derived=await scrypt(code,(useShort?p.short_recovery_salt:p?.salt)||'freak-invalid-credential-salt',64);
 const expected=Buffer.from((useShort?p.short_recovery_hash:p?.recovery_hash)||'0'.repeat(128),'hex');
 if(!p||!timingSafeEqual(derived,expected))throw error(401,'credentials','Teléfono o clave incorrectos.');person={id:p.id,alias:p.alias,phone:p.phone,display_name:p.display_name};
 }
 const session=randomBytes(32).toString('base64url');
 await q("INSERT INTO freak_sessions(token_hash,person,expires_at) VALUES($1,$2,now()+interval '30 days')",[hash(session),person.id]);
 return json({person,recovery},200,{'Set-Cookie':`${cookieName}=${session}; Path=/api/freak; Max-Age=2592000; Secure; HttpOnly; SameSite=Strict`});
 }
 if(op==='ticket'||op==='claim'){
 if(op==='ticket'&&req.method!=='GET'||op==='claim'&&!sensitive)throw error(405,'method','Confirma la captura con el botón.');
 const token=op==='claim'?body.token:req.headers.get('x-freak-ticket');
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw error(404,'invalid','Este boleto no es válido.');
 const tokenHash=hash(token);
 if(op==='claim'){
 if(!person)throw error(401,'login','Entra a tu colección antes de capturar.');
 if(person.phone&&!person.display_name)throw error(400,'name_required','Añade tu nombre para guardar el sticker.');
 const client=await db.pool.connect();
 try{
 await client.query('BEGIN');
 // Serializes each participant so the final total has an unambiguous reached-at time.
 await client.query('SELECT id FROM freak_people WHERE id=$1 FOR UPDATE',[person.id]);
 await client.query('SELECT number FROM freak_tickets WHERE campaign=$1 AND token_hash=$2 FOR UPDATE',[campaign,tokenHash]);
 await client.query(`UPDATE freak_tickets t SET owner=$1,claimed_at=clock_timestamp() FROM freak_campaigns c WHERE t.campaign=c.id AND c.id=$2 AND c.active=true AND t.token_hash=$3 AND t.owner IS NULL AND t.received_at IS NULL AND t.release_at<=now()`,[person.id,campaign,tokenHash]);
 await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }
 const t=(await q('SELECT *,release_at>now() AS unreleased FROM freak_tickets WHERE campaign=$1 AND token_hash=$2',[campaign,tokenHash])).rows[0];
 if(!t)throw error(404,'invalid','Este boleto no es válido para esta campaña.');
 const mine=t.owner&&t.owner===person?.id;
 const state=mine?'owned':t.received_at?'received':t.owner?'occupied':!config.active||t.unreleased?'unreleased':'available';
 // Locked tickets do not reveal their hidden act or rarity.
 const details=state==='unreleased'?null:ticket(t);
 return json({state,ticket:details,campaign,person},op==='claim'&&state!=='owned'?409:200);
 }
 if(op!=='state'||req.method!=='GET')throw error(404,'route','Acción no encontrada.');
 const owned=person?(await q('SELECT * FROM freak_tickets WHERE campaign=$1 AND owner=$2 ORDER BY display_number NULLS LAST,number',[campaign,person.id])).rows.map(ticket):[];
 const ranking=(await q(`SELECT p.alias,p.id,count(t.number)::int AS total,count(DISTINCT t.act)::int AS artists,count(t.number) FILTER (WHERE t.rare)::int AS rares,max(t.claimed_at) AS reached_at FROM freak_people p JOIN freak_tickets t ON t.owner=p.id AND t.campaign=p.campaign WHERE p.campaign=$1 GROUP BY p.id ORDER BY artists DESC,reached_at ASC,p.id ASC LIMIT 100`,[campaign])).rows.map((r,i)=>({place:i+1,alias:r.alias,total:r.total,artists:r.artists,rares:r.rares,mine:r.id===person?.id}));
 return json({campaign:config,person,owned,ranking,total:100,rareTotal:10});
 }catch(e){if(!e.status)console.error('FREAK request failed',e.message);return json({code:e.code||'unavailable',error:e.status?e.message:'El circo toma una pausa. Intenta de nuevo en un momento.'},e.status||503);}
};}
export default createHandler();
export const config={path:'/api/freak'};
