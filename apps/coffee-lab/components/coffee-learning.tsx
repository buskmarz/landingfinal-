'use client';
import { useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, FlaskConical, Droplets, ExternalLink, Coffee, SlidersHorizontal, Scale } from 'lucide-react';
import { RECIPES, defaultConfig, type Config, type MethodId } from '@/lib/coffee/domain';
import { METHOD_STORIES, TECHNIQUES } from '@/lib/coffee/learning';
import { MethodIcon } from '@/components/coffee-methods';
const techniqueIcons={water:Droplets,grind:SlidersHorizontal,ratio:Scale,acidity:Coffee,experiment:FlaskConical};
export function MethodHistory({method}:{method:MethodId}){
 const story=METHOD_STORIES[method];
 return <details className="lab-disclosure"><summary><BookOpen size={20}/>Historia del método<ChevronRight size={16}/></summary><div className="disclosure-body"><p className="story-date">{story.milestone}</p><p>{story.history}</p><a href={story.source} target="_blank" rel="noreferrer">{story.sourceName} <ExternalLink size={14}/></a></div></details>
}
export function LearningHub({onPrepare}:{onPrepare:(c:Config)=>void}){
 const [tab,setTab]=useState<'methods'|'technique'|'experiments'>('methods');const [selected,setSelected]=useState<MethodId|null>(null);const [dose,setDose]=useState(18);
 const recipe=RECIPES.find(r=>r.id===selected);const story=selected?METHOD_STORIES[selected]:null;
 return <section className={'learning-hub '+(recipe&&story?'is-detail':'')}><div className="compact-heading"><h2>Guías rápidas</h2></div><div className="lab-tabs" role="group" aria-label="Contenido para aprender">{([['methods','Métodos'],['technique','Agua y molienda'],['experiments','Experimentos']] as const).map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setSelected(null)}}>{label}</button>)}</div>
 {tab==='methods'&&(recipe&&story?<article className="method-lesson"><button className="text-button" onClick={()=>setSelected(null)}><ArrowLeft size={16}/> Todos los métodos</button><div className="lesson-identity"><MethodIcon method={recipe.id}/><div><h2>{recipe.name}</h2><p>{recipe.subtitle}</p></div></div><h3>Su historia</h3><p className="story-date">{story.milestone}</p><p>{story.history}</p><a className="source-link" href={story.source} target="_blank" rel="noreferrer">{story.sourceName} <ExternalLink size={14}/></a><h3>Cómo funciona</h3><ol className="visual-steps">{story.how.map((text,i)=><li key={text}><span>{i+1}</span>{text}</li>)}</ol><div className="try-it"><FlaskConical size={20}/><div><h3>Pruébalo</h3><p>{story.tryIt}</p></div></div><details className="compact-disclosure"><summary>Qué revisar antes de preparar</summary><p>{recipe.note}</p></details><button className="primary wide" onClick={()=>onPrepare(defaultConfig(recipe))}>Preparar {recipe.name}</button></article>:<div className="method-directory is-learning"><div className="compact-method-list">{RECIPES.map(r=><button key={r.id} className="method-list-row" onClick={()=>setSelected(r.id)}><MethodIcon method={r.id}/><span><strong>{r.name}</strong><small>{r.subtitle}</small></span><ChevronRight size={18}/></button>)}</div></div>)}
 {tab==='technique'&&<div className="technique-list">{TECHNIQUES.map(lesson=>{
  const Icon=techniqueIcons[lesson.id];
  return <details className="lab-disclosure" key={lesson.id}>
   <summary><Icon size={20} aria-hidden="true"/><span><strong>{lesson.title}</strong><small>{lesson.summary}</small></span><ChevronRight size={16} aria-hidden="true"/></summary>
   <div className="disclosure-body">
    <p>{lesson.body}</p>
    {lesson.steps&&<ol className="visual-steps">{lesson.steps.map((step,index)=><li key={step}><span aria-hidden="true">{index+1}</span>{step}</li>)}</ol>}
    {lesson.tip&&<p className="notice">{lesson.tip}</p>}
    {lesson.source&&<a className="source-link" href={lesson.source.url} target="_blank" rel="noreferrer">{lesson.source.label} <ExternalLink size={14} aria-hidden="true"/></a>}
   </div>
  </details>;
 })}</div>}
 {tab==='experiments'&&<div className="experiments"><details className="lab-disclosure"><summary><Droplets size={20}/><span><strong>Explora las cantidades</strong><small>Mismo café, tres ratios.</small></span><ChevronRight size={16}/></summary><div className="disclosure-body"><label className="field">Café: {dose} g<input aria-label="Café para explorar ratios" type="range" min="10" max="40" value={dose} onChange={e=>setDose(Number(e.target.value))}/></label><div className="ratio-comparison">{[14,16,18].map(r=><div key={r}><span>1:{r}</span><strong>{dose*r}<small> g</small></strong></div>)}</div><p>Agua añadida. El sabor también depende del café, agua, molienda y técnica.</p></div></details><details className="lab-disclosure"><summary><Coffee size={20}/><span><strong>Compara dos tazas</strong><small>Una variable, dos versiones.</small></span><ChevronRight size={16}/></summary><div className="disclosure-body"><ol className="visual-steps"><li><span>1</span>Guarda una preparación y su valoración.</li><li><span>2</span>Repítela con el mismo café. Cambia una variable.</li><li><span>3</span>En Historial, elige ambas y toca Comparar.</li></ol><p>Repite el experimento para observar consistencia. No es una prueba ciega.</p></div></details></div>}
 </section>
}
