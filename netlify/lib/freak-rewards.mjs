import {createHash,randomBytes} from 'node:crypto';
import {normalizePhone,normalizeName} from './freak-phone.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status,code:'rewards'})};
export async function rewardsAction({req,op,body,q,db,campaign,person,json,admin}){
 const write=req.method==='POST';
 if(op==='rewards'&&!write){
 const prizes=(await q('SELECT id,title,owner IS NOT NULL AS taken FROM freak_rewards WHERE campaign=$1 ORDER BY id',[campaign])).rows;
 const mine=person?(await q('SELECT id,title,claimed_at,delivered_at FROM freak_rewards WHERE campaign=$1 AND owner=$2',[campaign,person.id])).rows[0]:null;
 return json({prizes,mine,person:person?{name:person.display_name}:null});
 }
 if(op==='reward-claim'&&write){
 if(!person)fail(401,'Entra con tu celular.');
 if(typeof body.poster!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.poster))fail(400,'Escanea uno de los carteles de premios.');
 if(typeof body.code!=='string'||!/^[A-F0-9]{12}$/.test(body.code.toUpperCase())||typeof body.id!=='string'||!/^\d$/.test(body.id))fail(400,'Escribe el código de validación que recibiste en barra.');
 const client=await db.pool.connect();
 try{await client.query('BEGIN');
 await client.query('SELECT id FROM freak_people WHERE id=$1 FOR UPDATE',[person.id]);
 const previous=(await client.query('SELECT id,title FROM freak_rewards WHERE campaign=$1 AND owner=$2',[campaign,person.id])).rows[0];
 if(previous){if(previous.id!==body.id)fail(409,'Ya elegiste un premio.');await client.query('COMMIT');return json({ok:true,prize:previous});}
 const poster=(await client.query('SELECT id FROM freak_rewards WHERE campaign=$1 AND poster_hash=$2',[campaign,hash(body.poster)])).rows[0];
 if(!poster)fail(400,'Este cartel no es válido.');
 const v=(await client.query('SELECT person FROM freak_physical_validations WHERE campaign=$1 AND person=$2 AND code_hash=$3 AND normal_count+2*special_count>=10',[campaign,person.id,hash(body.code.toUpperCase())])).rows[0];
 if(!v)fail(403,'Primero valida tus 10 puntos en barra y usa tu código.');
 const won=(await client.query('UPDATE freak_rewards SET owner=$1,claimed_at=clock_timestamp() WHERE campaign=$2 AND id=$3 AND owner IS NULL RETURNING id,title',[person.id,campaign,body.id])).rows[0];
 if(!won)fail(409,'Alguien eligió ese premio. Puedes escoger otro disponible.');
 await client.query('COMMIT');return json({ok:true,prize:won});
 }catch(e){await client.query('ROLLBACK');if(e.code==='23505')fail(409,'Ya elegiste un premio. Actualiza para verlo.');throw e}finally{client.release();}
 }
 if(!admin)fail(401,'Entra a administración.');
 if(op==='admin-rewards'&&!write){
 const prizes=(await q('SELECT r.id,r.title,r.claimed_at,r.delivered_at,p.display_name,p.phone FROM freak_rewards r LEFT JOIN freak_people p ON p.id=r.owner WHERE r.campaign=$1 ORDER BY r.id',[campaign])).rows;
 const validations=(await q('SELECT v.normal_count,v.special_count,v.created_at,p.display_name,p.phone FROM freak_physical_validations v JOIN freak_people p ON p.id=v.person WHERE v.campaign=$1 ORDER BY v.created_at DESC',[campaign])).rows;
 return json({prizes,validations});
 }
 if(op==='admin-validate-points'&&write){
 const phone=normalizePhone(body.phone),name=normalizeName(body.name);
 if(!phone||!name||!Number.isInteger(body.normal)||!Number.isInteger(body.special)||body.normal<0||body.special<0||body.normal>5000||body.special>5000||body.normal+2*body.special<10||body.marked!==true)fail(400,'Revisa nombre, celular, 10 puntos y marca los stickers físicos como contados.');
 const code=randomBytes(6).toString('hex').toUpperCase();
 const result=await q(`INSERT INTO freak_physical_validations(campaign,person,normal_count,special_count,code_hash,admin) SELECT $1,id,$3,$4,$5,$6 FROM freak_people WHERE campaign=$1 AND phone=$2 AND display_name=$7 ON CONFLICT(campaign,person) DO NOTHING RETURNING person`,[campaign,phone,body.normal,body.special,hash(code),admin.admin,name]);
 if(!result.rowCount)fail(409,'La persona debe registrarse primero. Revisa nombre y celular; si ya fue validada, conserva su código original.');
 return json({ok:true,code,points:body.normal+2*body.special});
 }
 if(op==='admin-deliver-reward'&&write){
 if(typeof body.id!=='string')fail(400,'Premio inválido.');
 const result=await q('UPDATE freak_rewards SET delivered_at=clock_timestamp() WHERE campaign=$1 AND id=$2 AND owner IS NOT NULL AND delivered_at IS NULL RETURNING id',[campaign,body.id]);
 if(!result.rowCount)fail(409,'Ese premio no está pendiente de entrega.');return json({ok:true});
 }
 fail(404,'Acción no encontrada.');
}
