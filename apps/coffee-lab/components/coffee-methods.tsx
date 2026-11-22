'use client';
import { useState } from 'react';
import { ChevronRight, Heart, SlidersHorizontal } from 'lucide-react';
import { RECIPES, minutes, type Recipe, type MethodId } from '@/lib/coffee/domain';
// The tinted body and the line details stay readable at toolbar and recipe sizes.
const silhouettes: Record<MethodId, { body: string; detail: string }> = {
 v60: {
  body: 'M4 6h23l-9 14h-5L4 6Z',
  detail: 'M8 6c.6 4 4 8 7.4 11M14 6c0 4 1.6 7 3.5 9M21 6c-1 3-1.7 4.6-2 6m-9 9h12m-10 2h8v2a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3v-2Z',
 },
 aeropress: {
  body: 'M10 11h12v13H10z',
  detail: 'M9 3h14m-10 0v8m6-8v8M8.5 11h15M13 15h5m-5 3h3M7 24h18m-14 2h10l-2 3h-6l-2-3Z',
 },
 french: {
  body: 'M6 9h16v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9Z',
  detail: 'M4 9h20M8 8c.6-2 3-3 6-3s5.4 1 6 3M12 3h4m-2 0v17m-5 0h10m3-7h3a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-3',
 },
 chemex: {
  body: 'M6 4h20l-7.5 10v3L25 26c1 2-.1 3-2 3H9c-2 0-3-1-2-3l6.5-9v-3L6 4Z',
  detail: 'm10 5 5 7m-2 2h6m-6 3h6m0-1.5 4 3-.8 3m-11.2 2c4-2 6 2 11 0',
 },
 kalita: {
  body: 'M4 7h21l-3 13H8L4 7Z',
  detail: 'M6 5h17m-14 5 2 7m3-7 .6 7m4.4-7-1 7m7-8h1.5a2.7 2.7 0 0 1 .5 5l-3 1m-13 6v3h10v-3m-14 5h17',
 },
 moka: {
  body: 'm8 8 14-1-3 11 3 10H7l4-10L8 8Z',
  detail: 'M6 8h17L16 4h-3L6 8Zm8-4V2h2m-5 16h8M12 10l1.3 5m3.7-5-.6 5m-3 6-1 5m5-5 1 5m4-16h3c2 0 3 1 2.5 3l-1.5 5m-20-8 4 1',
 },
 espresso: {
  body: 'M4 5h22v6H4zM8 18h12v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-3Z',
  detail: 'M7 11v16m-3 1h23M10 11v3h7v-3m0 2h6m-10 3v.5m3-.5v.5m4 3h2a2 2 0 0 1 0 4h-2M8 8h3m9 0h2',
 },
 cold: {
  body: 'M9 7h13l2 18c.3 2-1 3-3 3H10c-2 0-3-1-3-3L9 7Z',
  detail: 'M9 4h13v3H9zM8 18c4-2 8 2 15 0m-11-6 3-1 1 3-3 1-1-3Zm4 9 2.5-1 1 2.5-2.5 1-1-2.5Z',
 },
};

export function MethodIcon({method}:{method:MethodId}){
 const { body, detail } = silhouettes[method];
 return <svg className="method-glyph" width="32" height="32" viewBox="0 0 32 32" fill="none"
  stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d={body} fill="currentColor" fillOpacity=".12"/>
  <path d={detail}/>
 </svg>;
}
export function MethodList({favorites,owned,onChoose,onShowAll}:{favorites:string[];owned:string[];onChoose:(r:Recipe)=>void;onShowAll?:()=>void}){
 const preview=!!onShowAll;
 const [onlyFav,setOnlyFav]=useState(false);const [onlyOwned,setOnlyOwned]=useState(false);const [time,setTime]=useState('all');const [difficulty,setDifficulty]=useState('all');
 const ranked=[...RECIPES].sort((a,b)=>(Number(favorites.includes(b.id))*2+Number(owned.includes(b.id)))-(Number(favorites.includes(a.id))*2+Number(owned.includes(a.id))));
 const filtered=ranked.filter(r=>(!onlyFav||favorites.includes(r.id))&&(!onlyOwned||owned.includes(r.id))&&(time==='all'||r.steps.reduce((s,x)=>s+x.seconds,0)<=Number(time)*60)&&(difficulty==='all'||r.difficulty===difficulty));
 return <section className={`method-directory ${preview?'is-preview':'is-library'}`}>{onShowAll&&<div className="section-top home-method-heading">
  <h2>Métodos</h2>
  <button className="text-button" onClick={onShowAll}>Todos los métodos<ChevronRight size={16} aria-hidden="true"/></button>
 </div>}{!preview&&<details className="method-filters lab-disclosure"><summary><SlidersHorizontal size={18}/>Filtros{(onlyFav||onlyOwned||time!=='all'||difficulty!=='all')&&<span>· activos</span>}<ChevronRight size={16}/></summary><div className="disclosure-body"><div className="filter-buttons"><button className="subtle" aria-pressed={onlyFav} onClick={()=>setOnlyFav(!onlyFav)}><Heart size={16}/> Favoritos</button><button className="subtle" aria-pressed={onlyOwned} onClick={()=>setOnlyOwned(!onlyOwned)}>Mi equipo</button></div><div className="form-grid"><label className="field">Duración<select value={time} onChange={e=>setTime(e.target.value)}><option value="all">Cualquier duración</option><option value="5">Hasta 5 min</option><option value="10">Hasta 10 min</option></select></label><label className="field">Dificultad<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="all">Cualquiera</option><option>Fácil</option><option>Intermedio</option><option>Avanzado</option></select></label></div><button className="text-button" onClick={()=>{setOnlyFav(false);setOnlyOwned(false);setTime('all');setDifficulty('all')}}>Quitar filtros</button></div></details>}
 <div className="compact-method-list">{(preview?filtered.slice(0,6):filtered).map(r=><button className="method-list-row" key={r.id} onClick={()=>onChoose(r)}><MethodIcon method={r.id}/><span><strong>{r.name}{favorites.includes(r.id)&&<Heart size={12} fill="currentColor" aria-label="Favorito"/>}</strong><small><span className="method-duration">{minutes(r)}</span><span className="method-profile">{r.subtitle}</span></small></span><ChevronRight size={18} aria-hidden="true"/></button>)}</div>{!filtered.length&&<p className="notice">No hay métodos con esos filtros.{onlyOwned&&!owned.length?' Elige tu equipo en Preferencias.':' Prueba otra duración o dificultad.'}</p>}</section>
}
