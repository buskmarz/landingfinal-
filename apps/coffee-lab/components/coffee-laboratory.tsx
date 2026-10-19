import { useState } from 'react';
import { Coffee, Trophy, Sprout, BookOpen } from 'lucide-react';
import type { Store,Config } from '@/lib/coffee/domain';
import { CuppingLab } from './coffee-cupping';
import { ChampionLibrary } from './coffee-champions';
import { CoffeeAtlas } from './coffee-atlas';
import { LearningHub } from './coffee-learning';
import './coffee-laboratory.css';
export default function CoffeeLaboratory({state,commit,onPrepare,onUnsavedChange}:{state:Store;commit:(fn:(s:Store)=>Store)=>Promise<Store>;onPrepare:(c:Config)=>void;onUnsavedChange:(dirty:boolean)=>void}){
 const [unsaved,setUnsaved]=useState(false);
 const [tab,setTab]=useState('cupping');
 return <section className={'sensory-lab '+(state.activeCupping&&tab==='cupping'?'has-session':'')}><header className="sensory-hero"><div><p className="eyebrow">BETTER MOOD / LABORATORIO SENSORIAL</p><h1>Conoce tu café.</h1><p>Prueba. Compara. Descubre.</p></div><div className="sensory-bowl-scene" aria-hidden="true"><div className="sensory-bowl"><i/></div><span/></div></header><nav className="sensory-tabs" aria-label="Áreas del laboratorio">{[{id:'cupping',label:'Catar',icon:Coffee},{id:'champions',label:'Campeones',icon:Trophy},{id:'atlas',label:'Atlas',icon:Sprout},{id:'methods',label:'Métodos',icon:BookOpen}].map(t=><button key={t.id} disabled={unsaved&&t.id!=='cupping'} aria-pressed={tab===t.id} onClick={()=>setTab(t.id)}><t.icon size={18}/>{t.label}{t.id==='cupping'&&state.activeCupping&&<span className="sensory-live-dot" aria-label="Cata en curso"/>}</button>)}</nav>{state.activeCupping&&tab!=='cupping'&&<button className="sensory-resume" onClick={()=>setTab('cupping')}>Cata en curso · volver a los tiempos →</button>}{tab==='cupping'&&<CuppingLab state={state} commit={commit} onUnsavedChange={dirty=>{setUnsaved(dirty);onUnsavedChange(dirty)}}/>} {tab==='champions'&&<ChampionLibrary disabled={!!state.active||!!state.activeCupping} onPrepare={onPrepare}/>} {tab==='atlas'&&<CoffeeAtlas/>} {tab==='methods'&&<LearningHub onPrepare={onPrepare}/>}</section>
}
