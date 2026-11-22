import { useEffect, useState } from 'react';
import { clock, defaultConfig, RECIPES, targets, totalWater, type Active, type Store } from '@/lib/coffee/domain';
import { advanceBarCup, cancelBarCup, finishBarCup, startBarCup, type BarSlot } from '@/lib/coffee/bar';
import { LabIcon } from './lab-icon';

export function CoffeeBar({state, commit}: {state:Store;commit:(update:(s:Store)=>Store)=>Promise<Store>}) {
 const [now,setNow]=useState(Date.now);
 const running=state.bar?.some(a=>a?.status==='brewing')??false;
 useEffect(()=>{
  if(!running)return;
  const refresh=()=>setNow(Date.now());
  refresh();
  const timer=window.setInterval(refresh,250);
  document.addEventListener('visibilitychange',refresh);
  return ()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',refresh)};
 },[running]);
 return <section aria-label="Modo barra" className="coffee-bar">
  <div className="bar-intro"><LabIcon name="brew"/><div><h2>Modo barra</h2><p>Dos tazas · sin bolsa asociada.</p></div></div>
  <div className="bar-slots">{([0,1] as const).map(slot=><BarCup key={slot} slot={slot} cup={state.bar?.[slot]??null} now={now} commit={commit} blocked={!!state.activeCupping}/>)}</div>
 </section>;
}

function BarCup({slot,cup,now,commit,blocked}:{slot:BarSlot;cup:Active|null;now:number;commit:(update:(s:Store)=>Store)=>Promise<Store>;blocked:boolean}){
 const [method,setMethod]=useState(RECIPES[0].id);
 const [pending,setPending]=useState(false);
 const [cancel,setCancel]=useState(false);
 const [rating,setRating]=useState(0);
 const label=slot===0?'Taza A':'Taza B';
 const run=async (update:(s:Store)=>Store)=>{
  setPending(true);
  try{await commit(update);setCancel(false)}catch{/* Main app reports the storage error. */}
  finally{setPending(false)}
 };
 const recipe=RECIPES.find(r=>r.id===method)??RECIPES[0];
 const config=defaultConfig(recipe);
 const step=cup?.config.recipe.steps[cup.stepIndex];
 const target=cup&&targets(cup.config)[cup.stepIndex];
 return <article className="bar-cup" aria-label={label}>
  <h3>{label}</h3>
  {!cup?<><label className="field">Método<select value={method} onChange={e=>setMethod(e.target.value as typeof method)}>{RECIPES.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
   <p>{config.dose} g · {recipe.id==='moka'?'Agua bajo la válvula':`${totalWater(config)} g de ${recipe.id==='espresso'?'bebida':'agua'}`}</p>
   <button className="primary" disabled={pending||blocked} onClick={()=>{setRating(0);void run(s=>startBarCup(s,slot,config,Date.now(),crypto.randomUUID()))}}>Iniciar {label.toLowerCase()}</button></>
  :<><p>{cup.config.recipe.name} · {cup.status==='review'?'Lista':`${cup.stepIndex+1}/${cup.config.recipe.steps.length}`}</p>
   <strong className="bar-clock" aria-label="Tiempo total">{clock(cup.physicalSeconds??(now-cup.startedAt)/1000)}</strong>
   {cup.status==='brewing'&&step?<><h4>{step.title}</h4><p className="bar-step-time">Paso {clock((now-cup.stepStartedAt)/1000)} · ref. {clock(step.seconds)}</p><p>{step.instruction}</p>{target&&target.add>0&&<p><strong>{target.add} g → {target.total} g</strong> · objetivo</p>}
   <button className="primary" disabled={pending} onClick={()=>void run(s=>advanceBarCup(s,slot,cup.id,cup.stepIndex,Date.now()))}>{cup.stepIndex===cup.config.recipe.steps.length-1?'Terminar':'Siguiente paso'}</button></>:<>
   <label className="field">Valoración<select value={rating} onChange={e=>setRating(Number(e.target.value))}><option value={0}>Sin valorar</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}/5</option>)}</select></label>
   <button className="primary" disabled={pending} onClick={()=>void run(s=>finishBarCup(s,slot,cup.id,rating))}>Guardar {label.toLowerCase()}</button></>}
   {cancel?<div className="bar-cancel"><span>¿Descartar {label.toLowerCase()}?</span><button className="subtle" disabled={pending} onClick={()=>void run(s=>cancelBarCup(s,slot,cup.id))}>Descartar</button><button className="text-button" onClick={()=>setCancel(false)}>Conservar</button></div>:<button className="text-button" onClick={()=>setCancel(true)}>Descartar taza</button>}
  </>}
 </article>;
}
