import {useEffect,useRef,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {ChevronRight,MessageCircle,Paperclip,Send,Sparkles} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog';
import { RECIPES, totalWater, type Config } from '@/lib/coffee/domain';
import './coffee-chat.css';
type Message={role:'user'|'assistant';content:string;recipe?:string};
const chatPath='/.netlify/functions/coffee-chat';
const endpoint=Capacitor.isNativePlatform()?`https://bmoodcoffee.com${chatPath}`:chatPath;
const suggestions=['Mi café está amargo','Ayúdame con mi V60','¿Cómo cato este café?','Explícame lavado, natural y honey'];
function formatReply(content:string){
 return content.split(/\*\*([^*\r\n]+)\*\*/g).map((part,index)=>index%2?<strong key={index}>{part}</strong>:part);
}
function summarizeRecipe(config?:Config){
 if(!config)return '';
 const method=RECIPES.find(recipe=>recipe.id===config.recipe.id);
 if(!method)return '';
 const name=config.recipe.equipmentVariant==='switch'?'HARIO Switch':method.name;
 const dose=`${config.dose} g de café`;
 if(method.id==='moka')return `${name} · ${dose} · agua bajo la válvula`;
 const amount=`${totalWater(config)} g de ${method.id==='espresso'?'bebida objetivo':'agua añadida'}`;
 return `${name} · ${dose} · ${amount} · ${config.temperature} °C`;
}
export default function CoffeeChat({recipe}:{recipe?:Config}){
 const [open,setOpen]=useState(false),[messages,setMessages]=useState<Message[]>([]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[budgetEnded,setBudgetEnded]=useState(false);
 const [connection,setConnection]=useState<'checking'|'ready'|'unavailable'>('checking');
 const [connectionAttempt,setConnectionAttempt]=useState(0);
 const [attached,setAttached]=useState('');
 const lock=useRef(false),bottom=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null);
 const summary=summarizeRecipe(recipe);
 const attachedRecipe=attached===summary?attached:'';
 const question=draft.trim();
 const outgoing=attachedRecipe?`${question}\n\nMi receta: ${attachedRecipe}.`:question;
 const tooLong=outgoing.length>1600;
 const retryConnection=()=>setConnectionAttempt(attempt=>attempt+1);
 const changeOpen=(value:boolean)=>{
  if(!value)setAttached('');
  if(value)setConnection('checking');
  setOpen(value);
 };
 useEffect(()=>{
  if(!open||budgetEnded)return;
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),8000);
  let active=true;
  setConnection('checking');
  fetch(endpoint,{credentials:'omit',signal:controller.signal}).then(response=>{
   if(!response.ok)throw Error();
   return response.json();
  }).then(()=>{
   if(active)setConnection('ready');
  }).catch(()=>{
   if(active)setConnection('unavailable');
  }).finally(()=>window.clearTimeout(timeout));
  return ()=>{active=false;window.clearTimeout(timeout);controller.abort()};
 },[open,budgetEnded,connectionAttempt]);
 useEffect(()=>{
  if(!open||budgetEnded||connection!=='unavailable')return;
  const online=()=>setConnectionAttempt(attempt=>attempt+1);
  window.addEventListener('online',online);
  return ()=>window.removeEventListener('online',online);
 },[open,budgetEnded,connection]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest'})},[messages,busy]);
 async function send(){
 if(lock.current||!question||tooLong||connection!=='ready'||budgetEnded)return;
 lock.current=true;setBusy(true);setError('');
 const previous=messages.slice(-4).map(({role,content})=>({role,content}));
 const next:Message[]=[...previous,{role:'user',content:outgoing}];
 while(next.length>1&&new TextEncoder().encode(JSON.stringify(next)).length>8500)next.splice(0,2);
 const controller=new AbortController();
 const timeout=window.setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(endpoint,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:next}),signal:controller.signal});
  const data=await response.json().catch(()=>null);
  if(typeof data?.reservedCents==='number')setBudgetEnded(data.reservedCents>=100);
  if(!response.ok||typeof data?.reply!=='string'||!data.reply.trim()){
   setError(typeof data?.error==='string'?data.error:'No llegó una respuesta. Tu pregunta sigue aquí.');
   return;
  }
  setMessages([...messages,{role:'user',content:question,recipe:attachedRecipe||undefined},{role:'assistant',content:data.reply}]);
  setDraft('');setAttached('');
 }catch{
  setConnection('unavailable');
  setError('Se interrumpió la respuesta. Tu pregunta sigue aquí.');
 }finally{
  window.clearTimeout(timeout);
  setBusy(false);lock.current=false;
 }
 }
 const connectionLabel=budgetEnded?'En pausa':connection==='ready'?'Preguntas abiertas':connection==='checking'?'Conectando…':'Sin conexión';
 return <Dialog open={open} onOpenChange={changeOpen}>
 <DialogTrigger asChild><button className="barista-launch" aria-label="Abrir Pregunta al barista"><MessageCircle size={20}/><span>Barista IA</span></button></DialogTrigger>
 <DialogContent className="barista-panel">
 <header className="barista-heading"><span className="barista-orb"><Sparkles size={22}/></span><div><DialogTitle>Pregunta al barista</DialogTitle><DialogDescription className="sr-only">Consulta a Luna sobre café y métodos de preparación.</DialogDescription></div></header>
 <div className="barista-meta"><span>IA · Luna</span><span role="status">{connectionLabel}</span></div>
 <div className="barista-scroll"><p className="barista-intro">¿Qué quieres mejorar de tu café?</p>
 {messages.length===0&&<div className="barista-suggestions">{suggestions.map(s=><button key={s} disabled={busy||budgetEnded} onClick={()=>{setDraft(s);input.current?.focus()}}>{s}<ChevronRight size={16} aria-hidden="true"/></button>)}</div>}
 <div role="log" aria-label="Conversación con el barista" aria-live="polite" aria-relevant="additions">{messages.map((m,i)=><div key={i} className={'barista-message '+m.role}><small>{m.role==='user'?'Tú':'Barista IA'}</small><p>{m.role==='assistant'?formatReply(m.content):m.content}</p>{m.recipe&&<small>Receta · {m.recipe}</small>}</div>)}</div>
 {busy&&<p role="status">El barista está preparando tu respuesta…</p>}<div ref={bottom}/></div>
 <div className="barista-compose">
 {error&&<p role="alert" className="barista-error">{error}</p>}
 {budgetEnded&&<p role="status">Terminó el presupuesto de esta prueba. Puedes seguir usando las guías.</p>}
 {connection==='unavailable'&&!budgetEnded&&<button type="button" className="barista-reconnect" onClick={retryConnection}>Reintentar conexión</button>}
 {summary&&<div className="barista-recipe">
 <button type="button" aria-pressed={!!attachedRecipe} aria-describedby="barista-recipe-summary" disabled={busy||budgetEnded} onClick={()=>setAttached(attachedRecipe?'':summary)}>
  <Paperclip size={16} aria-hidden="true"/> {attachedRecipe?'Receta adjunta':'Adjuntar receta'}
 </button>
 <small id="barista-recipe-summary">{summary}</small>
 </div>}
 {tooLong&&<p role="status">Acorta tu pregunta o quita la receta adjunta.</p>}
 <form onSubmit={e=>{e.preventDefault();void send()}}><label className="sr-only" htmlFor="barista-question">Tu pregunta sobre café</label><textarea id="barista-question" ref={input} rows={2} maxLength={1600} placeholder="Escribe tu pregunta…" value={draft} disabled={busy||budgetEnded} onChange={e=>setDraft(e.target.value)}/><button type="submit" aria-label="Enviar pregunta" disabled={busy||!question||tooLong||connection!=='ready'||budgetEnded}><Send size={20}/></button></form>
 <div className="barista-footer"><small>OpenAI procesa tus mensajes y la receta que adjuntes. Evita datos personales. La IA puede equivocarse.</small><button disabled={busy||!messages.length} onClick={()=>{setMessages([]);setError('');setAttached('')}}>Nueva charla</button></div><small className="barista-limit-note">Gratis mientras haya presupuesto disponible.</small>
 </div></DialogContent></Dialog>;
}
