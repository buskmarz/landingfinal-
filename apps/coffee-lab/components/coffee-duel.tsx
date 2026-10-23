import { useRef, useState } from 'react';
import { ArrowRight, Check, FlaskConical } from 'lucide-react';
import { clock, totalWater, temperature, type Store } from '@/lib/coffee/domain';
import { addDuel, createDuel, duelEvidence, duelKey, DUEL_METHODS, finishDuel, type Duel, type DuelSide } from '@/lib/coffee/duel';

type Props={state:Store;commit:(fn:(s:Store)=>Store)=>Promise<Store>;onPrepare:(d:Duel,side:DuelSide)=>void;onResume:()=>void};
export function CoffeeDuel({state,commit,onPrepare,onResume}:Props){
 const [creating,setCreating]=useState(false);
 const [method,setMethod]=useState('v60'),[bagId,setBagId]=useState(''),[coffee,setCoffee]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[archive,setArchive]=useState(false);
 const lock=useRef(false);
 const run=async(fn:(s:Store)=>Store)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await commit(fn);setArchive(false);setCreating(false)}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar. Inténtalo de nuevo.')}finally{setBusy(false);lock.current=false}};
 const current=state.duels?.find(d=>!d.result&&!d.archived);
 const past=(state.duels||[]).filter(d=>d.result||d.archived);
 const latest=past.find(d=>d.result);
 const chosen=DUEL_METHODS.find(r=>r.id===method)!;
 const evidence=current?duelEvidence(state,current):null;
 const sessionBusy=!!state.active||!!state.activeCupping;
 const cards=(d:Duel)=> <div className="duel-pair">{(['a','b'] as const).map(side=>{
  const brew=state.brews.find(b=>b.id===d[duelKey(side)]);
  const running=!!state.active&&state.active.id===d[duelKey(side)];
  return <article key={side} className={'duel-cup duel-cup-'+side}>
   <div className="duel-cup-top"><b>{side.toUpperCase()}</b><span>{brew?<><Check size={13}/> Guardada</>:running?'En curso':'Por preparar'}</span></div>
   <div className="duel-vessel" aria-hidden="true"><i/></div>
   <strong className="duel-water">{totalWater(d[side])}<small> g</small></strong><span className="micro">agua añadida · 1:{d[side].ratio}</span>
   {brew?<p className="duel-time">{clock(brew.physicalSeconds)} · {brew.evaluation.rating?`${brew.evaluation.rating} ★`:'Sin valorar'}</p>:<button className="subtle wide" disabled={busy||(!running&&(sessionBusy||side==='b'&&!evidence?.a))} onClick={()=>running?onResume():onPrepare(d,side)}>{running?'Continuar':`Preparar ${side.toUpperCase()}`}<ArrowRight size={15}/></button>}
  </article>})}</div>;
 return <section className="duel-lab" aria-labelledby="duel-title">
  <header className="duel-heading"><span className="duel-mark" aria-hidden="true">A / B</span><div><p className="eyebrow">UN CAMBIO. DOS TAZAS.</p><h1 id="duel-title">¿Cuál prefieres?</h1><p>Mismo café. Un poco más de agua.</p></div></header>
  {error&&<p className="error-note" role="alert">{error}</p>}
  {!current&&latest&&!creating&&<div className="duel-saved" role="status"><Check size={24}/><p className="eyebrow">RETO GUARDADO</p><h3>{latest.result?.choice==='same'?'También vale un empate.':`Tu favorita: taza ${latest.result?.choice.toUpperCase()}.`}</h3><p>{latest.coffee} · {latest.a.recipe.name}</p><p>A: {totalWater(latest.a)} g · B: {totalWater(latest.b)} g de agua</p><button className="primary wide" onClick={()=>setCreating(true)}>Crear otro reto</button></div>}
  {!current&&(!latest||creating)?<div className="duel-setup">
   <div className="duel-fields"><label className="field">Tu método<select value={method} onChange={e=>setMethod(e.target.value)}>{DUEL_METHODS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
   <label className="field">Tu café<select value={bagId} onChange={e=>setBagId(e.target.value)}><option value="">Sin bolsa</option>{state.bags.filter(b=>!b.archived).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div>
   {!bagId&&<label className="field">Nombre del café <span className="sr-only">opcional</span><input maxLength={100} value={coffee} placeholder="Opcional · el mismo para ambas tazas" onChange={e=>setCoffee(e.target.value)}/></label>}
   <div className="duel-preview" aria-label="Cantidades por taza"><div><b>A</b><strong>{Math.round(chosen.dose*chosen.ratio)} g</strong><span>de agua</span></div><ArrowRight aria-hidden="true"/><div><b>B</b><strong>{Math.round(chosen.dose*(chosen.ratio+2))} g</strong><span>de agua</span></div></div>
   <p className="duel-fixed">{chosen.dose} g de café por taza · {chosen.dose*2} g en total</p>
   <button className="primary wide" disabled={busy||sessionBusy} onClick={()=>{void run(s=>addDuel(s,createDuel(method,bagId||null,state.bags.find(b=>b.id===bagId)?.name||coffee)))}}><FlaskConical size={18}/> Crear mi reto</button>
   {sessionBusy&&<p className="micro">Termina tu preparación o cata para empezar.</p>}
  </div>:current?<>
   <p className="duel-fixed">{current.coffee} · {current.a.recipe.name}<br/>{current.a.dose} g por taza · {temperature(current.a.temperature,state.preferences.unit)} · misma molienda</p>
   <ol className="duel-progress" aria-label="Progreso del reto"><li className={evidence?.a?'done':''}>1. Taza A</li><li className={evidence?.b?'done':''}>2. Taza B</li><li>3. Comparar</li></ol>
   {cards(current)}
   {evidence?.ready?<fieldset className="duel-verdict" disabled={busy}><legend>Prueba ambas. ¿Cuál te gustó más?</legend><div>{([{id:'a',label:'Prefiero A'},{id:'b',label:'Prefiero B'},{id:'same',label:'Sin diferencia'}] as const).map(c=><button className="subtle" key={c.id} onClick={()=>void run(s=>finishDuel(s,current.id,c.id,''))}>{c.label}</button>)}</div><p className="micro">Tu elección se guarda al tocarla. También vale no notar diferencia.</p></fieldset>:<p className="duel-next">{evidence?.changed||evidence?.incomplete?'Una taza cambió o quedó incompleta. Conserva lo aprendido y archiva este reto para repetirlo.':!evidence?.a?'Empieza por A. Confirma cada paso al terminarlo.':'Ahora B: conserva el café, molienda y temperatura.'}</p>}
   {!evidence?.a&&!evidence?.b&&<p className="micro">El café se descuenta solo al guardar cada preparación.</p>}
   {archive?<div className="duel-archive"><p>Se conservan las tazas y el reto.</p><button className="subtle" disabled={busy||sessionBusy} onClick={()=>void run(s=>({...s,duels:s.duels?.map(d=>d.id===current.id?{...d,archived:true}:d)}))}>Confirmar archivo</button><button className="text-button" onClick={()=>setArchive(false)}>Volver</button></div>:<button className="text-button" disabled={busy||sessionBusy} onClick={()=>setArchive(true)}>Archivar este reto</button>}
  </>:null}
  <details className="compact-disclosure duel-help"><summary>Cómo comparar bien</summary><p>Usa el mismo café, molienda, temperatura y técnica. Solo cambia el agua indicada. Los pasos mantienen sus tiempos de referencia; registramos cuánto tardas realmente.</p><p>Prepara una taza después de la otra. Prueba ambas a una temperatura parecida: la primera puede enfriarse antes. Puedes invitar a alguien y compartirlas.</p><p>No es una prueba a ciegas. Tu elección describe estas dos tazas; una prueba no demuestra una causa. Comprueba los tiempos y pesos registrados en Historial.</p></details>
  {past.length>0&&<details className="duel-history" open={!current&&!creating}><summary>Mis retos · {past.length}</summary>{past.map(d=>{const e=duelEvidence(state,d);return <article key={d.id}><div><span className="eyebrow">{d.a.recipe.name} · {new Date(d.createdAt).toLocaleDateString('es-MX')}</span><h3>{d.coffee}</h3><p>{d.result?(d.result.choice==='same'?'No notaste diferencia':`Preferiste la taza ${d.result.choice.toUpperCase()}`):'Reto archivado'}</p></div><span className="duel-result">{d.result?(d.result.choice==='same'?'A = B':d.result.choice.toUpperCase()):'—'}</span><details><summary>Ver comparación</summary><p>A: {totalWater(d.a)} g de agua · 1:{d.a.ratio} · {e.a?clock(e.a.physicalSeconds):'Sin registro de taza'}</p><p>B: {totalWater(d.b)} g de agua · 1:{d.b.ratio} · {e.b?clock(e.b.physicalSeconds):'Sin registro de taza'}</p><p>{d.a.dose} g de café por taza · {temperature(d.a.temperature,state.preferences.unit)} · {d.a.grind}</p>{d.result&&!e.ready&&<p>Los registros actuales están incompletos o cambiaron. La elección guardada corresponde al momento de comparar.</p>}</details></article>})}</details>}
 </section>
}
