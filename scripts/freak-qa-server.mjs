// Local-only QA adapter. Never build or deploy this file.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {NetlifyDB} from '@netlify/database-dev';
import {getDatabase} from '@netlify/database';
import {createHandler} from '../netlify/functions/freak.mjs';
const engine=new NetlifyDB();
const db=getDatabase({connectionString:await engine.start()});
for(const file of (await fs.readdir('netlify/database/migrations')).filter(x=>x.includes('freak')&&!x.includes('inventory')).sort()) await db.pool.query(await fs.readFile('netlify/database/migrations/'+file,'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const poster=randomBytes(32).toString('base64url'),admin=randomBytes(32).toString('base64url');
await db.pool.query("UPDATE freak_rewards SET poster_hash=$1 WHERE campaign='freak-2026' AND id='1'",[hash(poster)]);
await db.pool.query("UPDATE freak_admins SET key_hash=$1 WHERE id='owner'",[hash(admin)]);
const handle=createHandler(db);
await fs.mkdir('output/freak-review',{recursive:true});
await fs.writeFile('output/freak-review/local-fixture.json',JSON.stringify({poster,admin,note:'LOCAL TEST ONLY. Generated independently; not production credentials.'}));
const publicFiles=new Set(JSON.parse(await fs.readFile('scripts/public-files.json','utf8')).files);
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.jpeg':'image/jpeg','.ttf':'font/ttf','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
 if(req.url.startsWith('/api/freak')){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const url=new URL(req.url,'http://127.0.0.1:5196');
  const headers=new Headers(req.headers);if(req.headers.origin)headers.set('origin','https://bmoodcoffee.com');
  const response=await handle(new Request('https://bmoodcoffee.com'+url.pathname+url.search,{method:req.method,headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}),{ip:req.headers['x-qa-ip']||'local-browser'});
  for(const [key,value]of response.headers)res.setHeader(key,value);
  res.writeHead(response.status);res.end(await response.text());return;
 }
 let file=path.resolve('.','.'+new URL(req.url,'http://localhost').pathname);
 if(file!==path.resolve('.')&&!file.startsWith(path.resolve('.')+path.sep))throw Error('Path');
 if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
 if(!publicFiles.has(path.relative(path.resolve('.'),file)))throw Error('Not a public asset');
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 let content=await fs.readFile(file);
 if(path.extname(file)==='.html')content=content.toString().replace('<body>','<body><div role="status" style="background:#83d9ce;color:#231f20;padding:10px;text-align:center;font:700 11px system-ui">VISTA LOCAL · DATOS DE PRUEBA · SIN PUBLICAR</div>');
 res.end(content);
 }catch(error){res.writeHead(404);res.end('Local QA: not found');}
});
server.listen(5196,'127.0.0.1',()=>console.log('Local FREAK QA on http://127.0.0.1:5196/freak/; isolated temporary database.'));
async function stop(){server.close();await db.pool.end();await engine.stop();process.exit(0);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
