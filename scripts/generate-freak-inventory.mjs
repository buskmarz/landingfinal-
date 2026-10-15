// Run ONCE for a new campaign. Never regenerate an inventory already printed/seeded.
import {randomBytes,createHash,randomInt} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
const destination=process.argv[2];
if(!destination || !path.isAbsolute(destination)) throw Error('Pass an absolute PRIVATE output directory outside the repository.');
await fs.mkdir(destination,{recursive:true,mode:0o700});
const manifestPath=path.join(destination,'inventory.json');
try {await fs.access(manifestPath);throw Error('Inventory already exists; refusing to replace tokens.')} catch(e){if(e.code!=='ENOENT')throw e;}
const inventory=[]; const statements=[];
for(const campaign of ['prueba','freak-2026']){
 let items=Array.from({length:100},(_,i)=>({rare:i>=90,act:Math.min(3,Math.floor(i/30)),variant:null,late:i>=90?i>=98:i%30>=24}));
 for(let i=items.length-1;i>0;i--){let j=randomInt(i+1);[items[i],items[j]]=[items[j],items[i]];}
 for(let i=0;i<100;i++){
 const t=items[i],token=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('hex');
 const release=campaign==='prueba'?'2026-10-01T00:00:00-06:00':t.late?'2026-10-28T00:00:00-06:00':'2026-10-15T00:00:00-06:00';
 inventory.push({campaign,number:i+1,...t,release,token,url:`https://bmoodcoffee.com/freak/?camp=${campaign}#boleto=${token}`});
 const quote=x=>x===null?'NULL':"'"+x.replaceAll("'","''")+"'";
 statements.push(`(${quote(campaign)},${i+1},'${hash}',${t.act},${t.rare},${quote(t.variant)},'${release}')`);
 }
}
// Three special test states use test inventory only; future test ticket remains locked.
const future=inventory.find(t=>t.campaign==='prueba'&&!t.rare);future.release='2099-10-28T00:00:00-06:00';
const idx=inventory.indexOf(future);statements[idx]=statements[idx].replace('2026-10-01T00:00:00-06:00',future.release);
await fs.writeFile(manifestPath,JSON.stringify(inventory,null,2),{mode:0o600,flag:'wx'});
await fs.writeFile('netlify/database/migrations/20261015193100_freak_inventory.sql',`-- Only SHA-256 hashes; raw QR tokens live in a private print export.\nINSERT INTO freak_tickets(campaign,number,token_hash,act,rare,variant,release_at) VALUES\n${statements.join(',\n')};\n`);
console.log('Prepared 100 real and 100 test tickets. Real campaign INACTIVE. Private export:',destination);
