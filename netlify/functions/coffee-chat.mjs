import {getDatabase} from '@netlify/database';
import {MODEL,PROMPT,validateMessages,RESERVE_CENTS} from '../lib/coffee-chat-policy.mjs';
export const RESERVE_SQL=`UPDATE coffee_lab_ai_budget SET reserved_cents=reserved_cents+$1, attempts=attempts+1 WHERE id='launch-20261028' AND enabled=true AND reserved_cents+$1<=cap_cents RETURNING reserved_cents`;
const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createHandler({database,fetcher=fetch,env=process.env}={}){
 return async(req)=>{
  if(!['GET','POST'].includes(req.method))return json(405,{error:'Método no permitido.'});
  // Preview deployments never spend against production's global budget.
  if((env.CONTEXT&&env.CONTEXT!=='production')||!env.COFFEE_LAB_OPENAI_KEY)return json(503,{error:'El barista no está disponible en esta vista previa.'});
  if(req.method==='GET')return json(200,{model:MODEL,reservedCents:0}); // no database wakeup from opening the chat
  if(req.headers.get('origin')!=='https://bmoodcoffee.com'||!req.headers.get('content-type')?.startsWith('application/json'))return json(403,{error:'Origen no permitido.'});
  if(Number(req.headers.get('content-length')||0)>18000)return json(413,{error:'Pregunta demasiado larga.'});
  let messages;
  try{const reader=req.body?.getReader();if(!reader)return json(400,{error:'Falta tu pregunta.'});const parts=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>18000){await reader.cancel();return json(413,{error:'Pregunta demasiado larga.'});}parts.push(value);}messages=validateMessages(JSON.parse(Buffer.concat(parts).toString('utf8')));}catch{return json(400,{error:'Revisa tu pregunta o inicia una nueva charla.'});}
  let reserved;
  try{const db=database||getDatabase();const result=await db.pool.query(RESERVE_SQL,[RESERVE_CENTS]);if(!result.rows.length)return json(429,{error:'El barista está en pausa por ahora. Puedes seguir usando las guías gratuitas.',reservedCents:100});reserved=result.rows[0].reserved_cents;}catch{return json(503,{error:'No se pudo verificar el presupuesto. Inténtalo más tarde.'});}
  try{
   const result=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${env.COFFEE_LAB_OPENAI_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,instructions:PROMPT,input:messages,reasoning:{effort:'none'},service_tier:'default',max_output_tokens:600,store:false}),signal:AbortSignal.timeout(22000)});
   if(!result.ok)throw Error('provider');const data=await result.json();const reply=data.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n').trim();if(!reply)throw Error('empty');return json(200,{reply,reservedCents:reserved});
  }catch{return json(502,{error:'El barista no pudo responder. Puedes volver a intentarlo.',reservedCents:reserved});}
 };
}
export default createHandler();
