'use client';
import { useState } from 'react';
import { ArrowLeft, Box, Heart, Droplets, Bean, Clock3, SlidersHorizontal, ChevronDown, ChevronRight, Check, Play } from 'lucide-react';
import { type Config,type Preferences,type Bag,type Brew, cupsThatFit,doseForWaterPerCup,scaleDoseForCups,totalWater,minutes,temperature,targets } from '@/lib/coffee/domain';
import { BrewBagPicker } from './brew-bag-picker';
import { MethodHistory } from './coffee-learning';
import { MethodIcon } from './coffee-methods';
export function RecipeSetup({config,onChange,preferences,bags,brews,favorite,onFavorite,onBack,on3D,onStart,onEdit,onAddBag,busy,issue}:{config:Config;onChange:(c:Config)=>void;preferences:Preferences;bags:Bag[];brews:Brew[];favorite:boolean;onFavorite:()=>void;onBack:()=>void;on3D:()=>void;onStart:()=>void;onEdit:()=>void;onAddBag:()=>void;busy:boolean;issue:string|null}){
 const [cups,setCups]=useState(1);
 const r=config.recipe;
 const espresso=r.id==='espresso';
 const moka=r.id==='moka';
 const waterMethod=!espresso&&!moka;
 const water=totalWater(config);
 const waterPerCup=Math.round(water/cups);
 const overCapacity=waterMethod&&(water>r.capacity||config.dose>r.maxDose);
 const cupsPerBatch=overCapacity?cupsThatFit(config,cups):cups;
 const adapted=!!r.source&&(config.dose!==r.dose||config.ratio!==r.ratio||config.temperature!==r.temperature||config.grind!==r.grind);
 const steps=targets(config);


 function changeCups(count:number){
  if(waterMethod)onChange({...config,dose:scaleDoseForCups(config.dose,cups,count)});
  setCups(count);
 }

 const ratioExample=espresso?`Con ratio 1:${config.ratio}, busca obtener ${water} g de espresso con ${config.dose} g de café por extracción.`:`Con ratio 1:${config.ratio}, añade ${config.ratio} g de agua por cada gramo de café.`;
 return <section className="recipe-setup"><button className="text-button" onClick={onBack}><ArrowLeft size={18}/> Métodos</button><div className="recipe-identity"><div><h1 tabIndex={-1} data-preparation-heading>{r.label||r.name}</h1><p>{adapted?'Tu adaptación · ':''}{r.subtitle}</p></div><div className="recipe-art"><MethodIcon method={r.id}/></div><button className="icon-button" aria-label={favorite?'Quitar de favoritos':'Guardar receta favorita'} aria-pressed={favorite} onClick={onFavorite}><Heart fill={favorite?'currentColor':'none'} size={22}/></button></div>
 <dl className="recipe-summary">
  <div><Bean size={18}/><dd>{config.dose} g</dd><dt>{espresso&&cups>1?'Café por extracción':'Café'}</dt></div>
  <div><Droplets size={18}/><dd>{moka?'Válvula':`${water} g`}{!espresso&&!moka&&<small className="water-volume">≈ {water} ml</small>}</dd><dt>{espresso?'Espresso objetivo':moka?'Agua por debajo':'Agua añadida'}</dt></div>
  <div><Clock3 size={18}/><dd>{minutes(r)}</dd><dt>{espresso&&cups>1?'Por extracción':'Orientativo'}</dt></div>
 </dl>
 <BrewBagPicker config={config} bags={bags} brews={brews} onSelect={bagId=>onChange({...config,bagId})} onAddBag={onAddBag}/>
 <details className="lab-disclosure">
  <summary><SlidersHorizontal size={20}/>Personalizar<ChevronRight size={16}/></summary>
  <div className="disclosure-body">
   {!moka&&<div className="recipe-servings">
    <div className="form-grid">
     <label className="field lab-select-field">Número de tazas
      <select value={cups} onChange={e=>changeCups(Number(e.target.value))}>
       {[1,2,3,4].map(count=><option key={count} value={count}>{count} {count===1?'taza':'tazas'}</option>)}
      </select>
      <ChevronDown size={18} aria-hidden="true"/>
     </label>
     {waterMethod&&<label className="field">Agua por taza (ml aprox.)
      <input inputMode="numeric" type="number" min="1" step="1" value={waterPerCup||''} disabled={config.ratio<=0} onChange={e=>onChange({...config,dose:doseForWaterPerCup(Number(e.target.value),cups,config.ratio)})}/>
     </label>}
    </div>
    {espresso&&cups>1&&<p className="micro" role="status">
     {cups} extracciones de {config.dose} g cada una. En total, {scaleDoseForCups(config.dose,1,cups)} g de café y {water*cups} g de espresso. Prepara y guarda cada extracción por separado.
    </p>}
    {overCapacity&&<p className="micro" role="status">
     Por tanda, este método admite hasta {r.maxDose} g de café y {r.capacity} g de agua.
     {cupsPerBatch>0?` Con este tamaño, prepara hasta ${cupsPerBatch} ${cupsPerBatch===1?'taza':'tazas'} por tanda.`:' Reduce el agua por taza para ajustar la receta.'}
    </p>}
   </div>}
   <div className="form-grid">
    <label className="field">{espresso?'Café por extracción (g)':waterMethod?'Café total (g)':'Café (g)'}
     <input inputMode="decimal" type="number" min={r.minDose} max={r.maxDose} step="any" value={config.dose||''} onChange={e=>onChange({...config,dose:Number(e.target.value)})}/>
    </label>
    {!moka&&<label className="field">Ratio 1:
     <input aria-describedby="recipe-ratio-help" inputMode="decimal" type="number" min={r.minRatio} max={r.maxRatio} step=".1" value={config.ratio||''} onChange={e=>onChange({...config,ratio:Number(e.target.value)})}/>
    </label>}
   </div>
   <p className="micro" id="recipe-ratio-help">{moka?'Llena la canasta al ras, sin compactar. Sigue la capacidad de tu moka.':ratioExample}</p>
   <div className="form-grid">
    {!moka&&<label className="field">Temperatura (°C)<input type="number" min="0" max="100" value={config.temperature} onChange={e=>onChange({...config,temperature:Number(e.target.value)})}/></label>}
    <label className="field">Molienda / ajuste<input value={config.grind} maxLength={100} onChange={e=>onChange({...config,grind:e.target.value})}/></label>
   </div>
   <button className="text-button" onClick={onEdit}>Crear mi versión</button>
  </div>
 </details>
 {!r.equipmentVariant&&<MethodHistory method={r.id}/>}<details className="lab-disclosure"><summary><Check size={20}/>Equipo y receta<ChevronRight size={16}/></summary><div className="disclosure-body"><ul className="equipment-list">{r.equipment.map(x=><li key={x}>{x}</li>)}</ul><p>{r.note}</p><p>{config.grind} · {r.id==='moka'?'Agua fría':temperature(config.temperature,preferences.unit)}</p><ol className="visual-steps">{r.steps.map((s,i)=><li key={i}><span>{i+1}</span><div><strong>{s.title}</strong><p>{s.instruction}</p>{s.fraction?`${steps[i].add} g → ${steps[i].total} g acumulados`:''}</div></li>)}</ol><p className="micro">Biblioteca inicial · versión {r.version}. Punto de partida pendiente de revisión por baristas de Better Mood.</p>{r.source&&<a className="source-link" href={r.source.url} target="_blank" rel="noreferrer">{r.source.name} · {r.source.status} ↗</a>}{!r.equipmentVariant&&<button className="subtle" onClick={on3D}><Box size={18}/> Explorar en 3D</button>}</div></details>
 {!preferences.scale&&<p className="notice">Las cantidades requieren báscula para ser precisas. Sin ella, usa la capacidad indicada por tu equipo.</p>}{!preferences.grinder&&<p className="micro">Pide molienda {r.grind.toLowerCase()} para {r.name}.</p>}{issue&&<p className="error-note" role="alert">{issue}</p>}<button className="primary wide setup-start" disabled={busy||!!issue} onClick={onStart}><Play size={18}/>{espresso&&cups>1?'Preparar una extracción':'Preparar café'}</button>
 </section>
}
