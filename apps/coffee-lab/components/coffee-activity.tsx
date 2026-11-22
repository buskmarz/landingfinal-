import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { Brew } from '@/lib/coffee/domain';
import { dayKey, monthActivity } from '@/lib/coffee/activity';
import { coach } from '@/lib/coffee/guidance';

const monthLabel = new Intl.DateTimeFormat('es-MX',{month:'long',year:'numeric'});
const dayLabel = new Intl.DateTimeFormat('es-MX',{dateStyle:'long'});

export function CoffeeActivity({ brews, selected, onDay }: { brews: Brew[]; selected: string; onDay: (day: string) => void }) {
 const [month,setMonth] = useState(() => new Date(new Date().getFullYear(),new Date().getMonth(),1));
 const y=month.getFullYear(), m=month.getMonth();
 const activity=monthActivity(brews,y,m);
 const step=(delta:number)=>setMonth(new Date(y,m+delta,1));
 return <section className="activity-overview" aria-label="Calendario de preparaciones">
  <div className="activity-heading">
   <button className="icon-button" aria-label="Mes anterior" onClick={()=>step(-1)}><ChevronLeft size={18}/></button>
   <h2 aria-live="polite">{monthLabel.format(month)}</h2>
   <button className="icon-button" aria-label="Mes siguiente" onClick={()=>step(1)}><ChevronRight size={18}/></button>
  </div>
  <dl className="activity-totals"><div><dt>Tazas</dt><dd>{activity.cups}</dd></div><div><dt>Métodos</dt><dd>{activity.methods}</dd></div><div><dt>Valoradas</dt><dd>{activity.rated}</dd></div></dl>
  <div className="activity-days">
   {['L','M','X','J','V','S','D'].map(label=><span key={label} aria-hidden="true">{label}</span>)}
   {Array.from({length:activity.offset},(_,i)=><span key={'pad-'+i} aria-hidden="true"/>)}
   {Array.from({length:activity.length},(_,i)=>{
    const date=new Date(y,m,i+1), key=dayKey(date), count=activity.days.get(key)??0;
    return count ? <button key={key} type="button" className="activity-day" aria-label={`${dayLabel.format(date)}: ${count} ${count===1?'taza':'tazas'}`} aria-pressed={selected===key} onClick={()=>onDay(selected===key?'':key)}>{i+1}<span>{count}</span></button> : <span key={key} className="activity-day idle" aria-hidden="true">{i+1}</span>;
   })}
  </div>
 </section>;
}

export function NextCup({ brew, onTry }: { brew: Brew; onTry: () => void }) {
 const advice=coach(brew);
 return <section className="next-cup">
  <div className="next-cup-icon"><Sparkles size={20} aria-hidden="true"/></div>
  <div><h2>Mi próxima taza</h2><p>{advice.change}</p>
   <details><summary>Qué observar</summary><p>{advice.watch}</p></details>
   <button className="subtle" onClick={onTry}>{advice.changed?'Probar ajuste':'Repetir y comparar'}</button>
  </div>
 </section>;
}
