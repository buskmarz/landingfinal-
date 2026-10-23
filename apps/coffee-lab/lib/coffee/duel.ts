import { RECIPES, defaultConfig, customRecipeError, remaining, type Config, type Store, type Active } from './domain.ts';
export type DuelSide='a'|'b';
export type Duel={id:string;createdAt:number;archived?:boolean;coffee:string;a:Config;b:Config;aBrewId:string|null;bBrewId:string|null;result:null|{choice:DuelSide|'same';note:string;at:number}};
export const DUEL_METHODS=RECIPES.filter(r=>['v60','french','chemex','kalita'].includes(r.id));
export const duelKey=(side:DuelSide)=>side==='a'?'aBrewId':'bBrewId';
export function sameDuelConfig(a:Config,b:Config){return a.dose===b.dose&&a.ratio===b.ratio&&a.temperature===b.temperature&&a.grind===b.grind&&a.bagId===b.bagId&&JSON.stringify(a.recipe)===JSON.stringify(b.recipe)}
export function validDuelPlan(d:Pick<Duel,'a'|'b'>){
 return DUEL_METHODS.some(r=>r.id===d.a.recipe.id)&&d.a.ratio!==d.b.ratio&&!customRecipeError(d.a)&&!customRecipeError(d.b)&&sameDuelConfig({...d.a,ratio:d.b.ratio},d.b);
}
export function createDuel(method:string,bagId:string|null,coffee:string,at=Date.now()):Duel{
 const recipe=DUEL_METHODS.find(r=>r.id===method);if(!recipe)throw new Error('Elige un método del reto.');
 const a={...defaultConfig(recipe),bagId};const b={...structuredClone(a),ratio:a.ratio+2};
 const d:Duel={id:crypto.randomUUID(),createdAt:at,coffee:coffee.trim().slice(0,100)||'Mi café',a,b,aBrewId:null,bBrewId:null,result:null};
 if(!validDuelPlan(d))throw new Error('Las cantidades no caben en este equipo.');return d;
}
export function addDuel(s:Store,d:Duel):Store{
 if(s.duels?.some(x=>!x.result&&!x.archived))throw new Error('Termina o archiva tu reto anterior primero.');
 if(s.active||s.activeCupping)throw new Error('Termina la sesión en curso primero.');
 if(!validDuelPlan(d))throw new Error('Revisa las dos recetas.');
 if(d.a.bagId){const bag=s.bags.find(x=>x.id===d.a.bagId&&!x.archived);if(!bag||remaining(bag,s.brews)<d.a.dose+d.b.dose)throw new Error('La bolsa no alcanza para las dos tazas.');}
 return {...s,duels:[d,...s.duels||[]]};
}
export function attachDuelBrew(s:Store,id:string,side:DuelSide,active:Active):Store{
 const d=s.duels?.find(x=>x.id===id);if(!d||d.result||d.archived)throw new Error('Este reto ya no está activo.');
 if(s.active||s.activeCupping)throw new Error('Ya hay una sesión en curso.');
 if(active.mode!=='paced')throw new Error('Confirma los pasos del reto a tu ritmo.');
 if(!sameDuelConfig(active.config,d[side]))throw new Error('Las cantidades del reto cambiaron. Vuelve a abrirlo.');
 if(d[duelKey(side)]&&s.brews.some(x=>x.id===d[duelKey(side)]))throw new Error('Esta taza ya está guardada.');
 if(side==='b'&&!s.brews.some(x=>x.id===d.aBrewId))throw new Error('Guarda primero la taza A.');
 if(active.config.bagId){const bag=s.bags.find(x=>x.id===active.config.bagId&&!x.archived);if(!bag||remaining(bag,s.brews)<active.config.dose)throw new Error('Revisa el café disponible en la bolsa.');}
 return {...s,active,duels:s.duels!.map(x=>x.id===id?{...x,[duelKey(side)]:active.id}:x)};
}
export function duelEvidence(s:Store,d:Duel){
 const a=s.brews.find(x=>x.id===d.aBrewId),b=s.brews.find(x=>x.id===d.bBrewId);
 const changed=!!a&&!!b&&(!sameDuelConfig(a.config,d.a)||!sameDuelConfig(b.config,d.b));
 const incomplete=[a,b].some(x=>!!x&&(x.mode!=='paced'||!x.events?.length||x.events.length<x.config.recipe.steps.length||x.events.some(e=>!e.completed)));
 return {a,b,changed,incomplete,ready:!!a&&!!b&&!changed&&!incomplete};
}
export function finishDuel(s:Store,id:string,choice:DuelSide|'same',note:string,at=Date.now()):Store{
 const d=s.duels?.find(x=>x.id===id);if(!d||d.archived)throw new Error('No encontramos un reto activo.');if(d.result)return s;
 const evidence=duelEvidence(s,d);if(!evidence.ready)throw new Error('Guarda ambas tazas completas, sin cambiar las recetas del reto.');
 if(!Number.isFinite(at)||at<Math.max(evidence.a!.finishedAt,evidence.b!.finishedAt))throw new Error('Revisa la hora del dispositivo.');
 return {...s,duels:s.duels!.map(x=>x.id===id?{...x,result:{choice,note:note.trim().slice(0,1000),at}}:x)};
}
