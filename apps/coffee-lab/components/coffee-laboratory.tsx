import { useState } from 'react';
import { ArrowLeftRight, Trophy, Sprout, BookOpen, Timer } from 'lucide-react';
import type { Store,Config } from '@/lib/coffee/domain';
import { CuppingLab } from './coffee-cupping';
import { ChampionLibrary } from './coffee-champions';
import { CoffeeAtlas } from './coffee-atlas';
import { LearningHub } from './coffee-learning';
import './coffee-laboratory.css';
import { LabIcon } from './lab-icon';
import { CoffeeBar } from './coffee-bar';
import { CoffeeDuel } from './coffee-duel';
import type { Duel,DuelSide } from '@/lib/coffee/duel';
export default function CoffeeLaboratory({state,commit,onPrepare,onUnsavedChange,tab,setTab,onDuel,onResume}:{tab:string;setTab:(tab:string)=>void;onDuel:(d:Duel,side:DuelSide)=>void;onResume:()=>void;state:Store;commit:(fn:(s:Store)=>Store)=>Promise<Store>;onPrepare:(c:Config)=>void;onUnsavedChange:(dirty:boolean)=>void}){
 const [unsaved,setUnsaved]=useState(false);
 return <section className={'sensory-lab '+(state.activeCupping&&tab==='cupping'?'has-session':'')}><header className="sensory-hero"><h1>Laboratorio</h1></header>
 <nav className="sensory-tabs" aria-label="Áreas del laboratorio">
  {[
   { id:'cupping', label:'Catar', icon:<LabIcon name="cupping"/> },
   { id:'duel', label:'Reto A/B', icon:<ArrowLeftRight/> },
   { id:'champions', label:'Campeones', icon:<Trophy/> },
   { id:'atlas', label:'Atlas', icon:<Sprout/> },
   { id:'methods', label:'Métodos', icon:<BookOpen/> },
   { id:'bar', label:'Barra', icon:<Timer/> },
  ].map(({id,label,icon})=>(
   <button key={id} disabled={unsaved&&id!=='cupping'} aria-pressed={tab===id} onClick={()=>setTab(id)}>
    {icon}{label}{id==='cupping'&&state.activeCupping&&<span className="sensory-live-dot" aria-label="Cata en curso"/>}
   </button>
  ))}
 </nav>{state.activeCupping&&tab!=='cupping'&&<button className="sensory-resume" onClick={()=>setTab('cupping')}>Cata en curso · volver a los tiempos →</button>}{tab==='duel'&&<CoffeeDuel state={state} commit={commit} onPrepare={onDuel} onResume={onResume}/>} {tab==='cupping'&&<CuppingLab state={state} commit={commit} onUnsavedChange={dirty=>{setUnsaved(dirty);onUnsavedChange(dirty)}}/>} {tab==='champions'&&<ChampionLibrary disabled={!!state.active||!!state.activeCupping} onPrepare={onPrepare}/>} {tab==='atlas'&&<CoffeeAtlas/>} {tab==='bar'&&<CoffeeBar state={state} commit={commit}/>} {tab==='methods'&&<LearningHub onPrepare={onPrepare}/>}</section>
}
