import {randomBytes,randomInt,scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';
import {normalizePhone,normalizeName} from './freak-phone.mjs';
const scrypt=promisify(scryptCallback);
export async function resetPersonPin({req,body,db,campaign,admin,json}){
 if(req.method!=='POST')return json({error:'Usa el formulario de recuperación.'},405);
 const phone=normalizePhone(body.phone),name=normalizeName(body.name);
 if(!phone||!name||body.confirmed!==true)return json({error:'Revisa nombre, celular y confirma la identidad.'},400);
 const pin=String(randomInt(10000000,100000000)),salt=randomBytes(16).toString('hex');
 const hashed=(await scrypt(pin,salt,64)).toString('hex');
 const c=await db.pool.connect();
 try{
  await c.query('BEGIN');
  const p=(await c.query('SELECT id FROM freak_people WHERE campaign=$1 AND phone=$2 AND display_name=$3 FOR UPDATE',[campaign,phone,name])).rows[0];
  if(!p){await c.query('ROLLBACK');return json({error:'No encontramos esa cuenta. Revisa sus datos.'},404);}
  await c.query('UPDATE freak_people SET salt=$1,recovery_hash=$2,recovery_length=8 WHERE id=$3',[salt,hashed,p.id]);
  await c.query('DELETE FROM freak_sessions WHERE person=$1',[p.id]);
  await c.query('INSERT INTO freak_pin_resets(campaign,person,admin) VALUES($1,$2,$3)',[campaign,p.id,admin.admin]);
  await c.query('COMMIT');return json({ok:true,pin});
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
