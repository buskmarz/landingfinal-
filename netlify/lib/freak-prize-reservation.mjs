import {createHash} from 'node:crypto';
const fail=(status,message)=>{throw Object.assign(Error(message),{status,code:'rewards'})};
export const reservationKey=r=>createHash('sha256').update(JSON.stringify([r.poster_id,r.person,r.created_at])).digest('hex');
// Only the campaign's ordinary coffee, food and edible maitake rewards can be assigned here.
const ordinaryRewards=new Map([['1','1 americano diario durante 2026'],['3','2 Tugo y 2 gomitas · Kit Necte'],['4','5 chilaquiles'],['5','Hongo maitake Commons']]);
export const adminAssignable=p=>ordinaryRewards.get(p.id)===p.title;
export async function reservePrize({req,body,db,campaign,admin,json}){
 if(req.method!=='POST')fail(405,'Usa el formulario de asignación.');
 if(typeof body.poster_id!=='string'||!/^[1-5]$/.test(body.poster_id)||typeof body.id!=='string'||!/^\d$/.test(body.id)||typeof body.reservationKey!=='string'||body.confirmed!==true)fail(400,'Selecciona la persona y el premio.');
 const client=await db.pool.connect();
 try{
  await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='5s'");
  await client.query('LOCK TABLE freak_rewards,freak_poster_reservations IN SHARE ROW EXCLUSIVE MODE');
  const saved=(await client.query('SELECT poster_id,person,created_at FROM freak_poster_reservations WHERE campaign=$1 AND poster_id=$2',[campaign,body.poster_id])).rows[0];
  if(!saved||reservationKey(saved)!==body.reservationKey)fail(409,'El QR guardado cambió. Actualiza antes de asignar.');
  const prize=(await client.query('SELECT * FROM freak_rewards WHERE campaign=$1 AND id=$2',[campaign,body.id])).rows[0];
  if(!prize||!adminAssignable(prize))fail(400,'Este premio no admite asignación desde el portal.');
  const existing=(await client.query('SELECT id FROM freak_rewards WHERE campaign=$1 AND (owner=$2 OR reserved_for=$2)',[campaign,saved.person])).rows[0];
  if(existing){if(existing.id===body.id&&prize.reserved_for===saved.person){await client.query('COMMIT');return json({ok:true,id:body.id,already_reserved:true});}fail(409,'Esta persona ya tiene un premio asignado o confirmado.');}
  if(prize.owner||prize.reserved_for)fail(409,'El premio ya no está disponible. Elige otro.');
  await client.query('INSERT INTO freak_reset_audit(campaign,number,admin,snapshot) VALUES($1,NULL,$2,$3)',[campaign,admin.admin,JSON.stringify({scope:'prize-reservation',poster_id:body.poster_id,person:saved.person,prize_id:body.id,previous:prize})]);
  await client.query('UPDATE freak_rewards SET reserved_for=$1,reserved_at=clock_timestamp(),reserved_by=$2 WHERE campaign=$3 AND id=$4',[saved.person,admin.admin,campaign,body.id]);
  await client.query('COMMIT');return json({ok:true,id:body.id,poster_id:body.poster_id});
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
