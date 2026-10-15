import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {series} from '../../freak/catalog.mjs';
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
 if(op==='admin-logout'&&write){await q('DELETE FROM freak_admin_sessions WHERE token_hash=$1',[hash(raw)]);return json({ok:true},200,{'Set-Cookie':sessionCookie('',0)})}
 if(op==='admin-lookup'&&write){
 if(typeof body.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.token))fail(400,'Enlace inválido.');
 const t=(await q('SELECT number FROM freak_tickets WHERE campaign=$1 AND token_hash=$2',[campaign,hash(body.token)])).rows[0];
 if(!t)fail(404,'El QR no pertenece a esta campaña.');return json(t);
 }
 if(op==='admin-list'&&!write){
 const rows=(await q(`SELECT t.number,t.act,t.rare,t.release_at,t.claimed_at,p.alias,
 l.place,l.reference,l.latitude,l.longitude,l.accuracy,l.physical,l.version,l.updated_at,
 COALESCE(v.opens,0)::int AS opens,v.first_open,v.last_open
 FROM freak_tickets t LEFT JOIN freak_people p ON p.id=t.owner
 LEFT JOIN freak_locations l ON l.campaign=t.campaign AND l.number=t.number
 LEFT JOIN (SELECT campaign,number,count(*) AS opens,min(created_at) AS first_open,max(created_at) AS last_open FROM freak_visits GROUP BY campaign,number) v ON v.campaign=t.campaign AND v.number=t.number
 WHERE t.campaign=$1 ORDER BY t.number`,[campaign])).rows.map(t=>({...t,name:series[t.act].name,physical:t.physical||'unplaced',version:t.version||0}));
 const history=(await q('SELECT number,snapshot,created_at FROM freak_location_history WHERE campaign=$1 ORDER BY id DESC LIMIT 300',[campaign])).rows;
 return json({tickets:rows,history});
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
