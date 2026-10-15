import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {NetlifyDB} from '@netlify/database-dev';import {getDatabase} from '@netlify/database';
test('ordering migration preserves all 200 identities, QR hashes, codes and ownership',async()=>{
 const engine=new NetlifyDB();let db,dir;try{const connectionString=await engine.start();db=getDatabase({connectionString});dir=await fs.mkdtemp(path.join(os.tmpdir(),'freak-order-'));
 const migration='20261015233000_freak_access_order.sql';const src='netlify/database/migrations';for(const name of (await fs.readdir(src)).filter(n=>n.endsWith('.sql')&&n<migration))await fs.copyFile(path.join(src,name),path.join(dir,name));await engine.applyMigrations(dir);
 const query='SELECT campaign,number,token_hash,short_code,act,rare,owner,claimed_at,received_at,received_alias FROM freak_tickets ORDER BY campaign,number';const before=(await db.pool.query(query)).rows;assert.equal(before.length,200);
 await db.pool.query(await fs.readFile(path.join(src,migration),'utf8'));assert.deepEqual((await db.pool.query(query)).rows,before);
 for(const campaign of ['prueba','freak-2026']){const rows=(await db.pool.query('SELECT act,rare,display_number FROM freak_tickets WHERE campaign=$1 ORDER BY display_number',[campaign])).rows;rows.forEach((r,i)=>{assert.equal(r.display_number,i+1);assert.equal(r.act,i<30?0:i<60?1:i<90?2:3);assert.equal(r.rare,i>=90)});}
 }finally{await db?.pool.end();await engine.stop();if(dir)await fs.rm(dir,{recursive:true});}
});
