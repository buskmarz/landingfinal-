import {createHash} from 'node:crypto';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status,code:'admin'})};
// Bind confirmation to the owner and activity last shown in the panel.
export const posterResetKey=p=>createHash('sha256').update(JSON.stringify([
 p.id,p.saved_at,p.display_name,p.phone,p.opens,p.scans,p.attempts,
 p.validated,p.claimed,p.delivered
])).digest('hex');

export async function resetPosterTest({req,body,db,campaign,admin,json}){
 if(req.method!=='POST')fail(405,'Usa el formulario de borrado.');
 if(typeof body.id!=='string'||!/^[1-5]$/.test(body.id)||body.confirm!==`BORRAR PRUEBA QR ${body.id}`||!/^([a-f0-9]{64})$/.test(body.resetKey))fail(400,'Confirma el QR de prueba que quieres liberar.');
 const client=await db.pool.connect();
 try{
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout='5s'");
  await client.query("SET LOCAL statement_timeout='10s'");
  // Briefly freeze writes so no new scan/reservation can be erased unseen.
  await client.query('LOCK TABLE freak_rewards,freak_poster_reservations,freak_poster_visits,freak_poster_open_events,freak_poster_save_events,freak_physical_validations,freak_people IN SHARE ROW EXCLUSIVE MODE');
  const reward=(await client.query('SELECT * FROM freak_rewards WHERE campaign=$1 AND id=$2',[campaign,body.id])).rows[0];
  if(!reward)fail(404,'QR no encontrado.');
  const tables=['freak_poster_reservations','freak_poster_visits','freak_poster_open_events','freak_poster_save_events'];
  const snapshot={scope:'single-prize-qr-test',poster_id:body.id,reward};
  for(const table of tables)snapshot[table]=(await client.query('SELECT * FROM '+table+' WHERE campaign=$1 AND poster_id=$2',[campaign,body.id])).rows;
  const reservation=snapshot.freak_poster_reservations[0];
  if(!reservation)fail(409,'Este QR ya está disponible. Actualiza el panel.');
  const person=(await client.query('SELECT display_name,phone FROM freak_people WHERE campaign=$1 AND id=$2',[campaign,reservation.person])).rows[0];
  const validated=(await client.query('SELECT person FROM freak_physical_validations WHERE campaign=$1 AND person=$2',[campaign,reservation.person])).rowCount>0;
  const wins=(await client.query('SELECT id,delivered_at FROM freak_rewards WHERE campaign=$1 AND owner=$2',[campaign,reservation.person])).rows;
  if(validated||wins.length||reward.owner||reward.delivered_at)fail(409,'Ya hay puntos validados o un premio confirmado. No se puede borrar como prueba.');
  const state={id:body.id,saved_at:reservation.created_at,display_name:person?.display_name??null,phone:person?.phone??null,opens:snapshot.freak_poster_open_events.length,scans:snapshot.freak_poster_visits.length,attempts:snapshot.freak_poster_save_events.length,validated,claimed:wins.length>0,delivered:wins.some(r=>r.delivered_at!==null)};
  if(posterResetKey(state)!==body.resetKey)fail(409,'El registro cambió. Actualiza y revisa antes de borrar.');
  snapshot.registration=person;
  const audit=(await client.query('INSERT INTO freak_reset_audit(campaign,number,admin,snapshot) VALUES($1,NULL,$2,$3) RETURNING id',[campaign,admin.admin,JSON.stringify(snapshot)])).rows[0];
  for(const table of [...tables].reverse())await client.query('DELETE FROM '+table+' WHERE campaign=$1 AND poster_id=$2',[campaign,body.id]);
  await client.query('COMMIT');
  return json({ok:true,scope:snapshot.scope,poster_id:body.id,archivedOpens:state.opens,audit_id:audit.id});
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
