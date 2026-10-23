import { validDuelPlan } from './duel.ts';
import { cuppingSchema } from './cupping.ts';
import { z } from 'zod';
import { customRecipeError, remaining, type Store, type Config, type SavedRecipe } from './domain.ts';
const text=z.string().max(4000),id=z.string().min(1).max(200),num=z.number().finite(),positive=num.positive();
const method=z.enum(['v60','aeropress','french','chemex','kalita','moka','espresso','cold']);
const step=z.object({title:text.min(1),instruction:text.min(1),seconds:positive.max(86400),fraction:num.min(0).max(1).optional(),manual:z.boolean().optional()});
const recipe=z.object({equipmentVariant:z.literal('switch').optional(),source:z.object({name:text,url:z.string().url().max(2000).regex(/^https:\/\//),status:text}).optional(),label:text.optional(),id:method,name:text.min(1),subtitle:text,family:text,description:text,dose:positive,ratio:positive,temperature:num.min(0).max(100),grind:text,equipment:z.array(text.min(1)).min(1).max(20),steps:z.array(step).min(1).max(20),minDose:positive,maxDose:positive.max(100000),minRatio:positive,maxRatio:positive.max(100),capacity:positive.max(100000),note:text,difficulty:text,version:positive.int()});
export const configSchema=z.object({recipe,dose:positive,ratio:positive,temperature:num.min(0).max(100),grind:text,bagId:id.nullable()}).superRefine((c,ctx)=>{const issue=customRecipeError(c);if(issue)ctx.addIssue({code:'custom',message:issue});if(c.recipe.minDose>c.recipe.maxDose||c.recipe.minRatio>c.recipe.maxRatio)ctx.addIssue({code:'custom',message:'Límites de receta inválidos.'})});
const evaluation=z.object({rating:num.int().min(0).max(5),again:z.boolean(),tags:z.array(text).max(30),notes:text,sweet:num.min(1).max(5),acid:num.min(1).max(5),bitter:num.min(1).max(5),body:num.min(1).max(5),astringency:num.min(1).max(5),output:num.min(0).max(100000).nullable()});
const timestamp=num.min(0).max(8640000000000000);
const rhythm={mode:z.enum(['guided','paced']).optional(),events:z.array(z.object({stepIndex:num.int().min(0),startedAt:timestamp,endedAt:timestamp,completed:z.boolean(),waterChoice:z.enum(['recipe','target']).optional(),actualTotal:num.min(0).max(100000).optional()})).max(20).optional()};
function validEvents(a:{config:Config;startedAt:number;finishedAt:number|null;events?:{stepIndex:number;startedAt:number;endedAt:number;actualTotal?:number}[]}){
 let previousEnd=a.startedAt,previousStep=-1,previousWeight=0;
 return (a.events||[]).every(e=>{const valid=e.stepIndex>previousStep&&e.stepIndex<a.config.recipe.steps.length&&e.startedAt>=previousEnd&&e.endedAt>=e.startedAt&&(a.finishedAt===null||e.endedAt<=a.finishedAt)&&(e.actualTotal===undefined||e.actualTotal>=previousWeight);previousStep=e.stepIndex;previousEnd=e.endedAt;previousWeight=e.actualTotal??previousWeight;return valid});
}
const brew=z.object({...rhythm,id,config:configSchema,startedAt:timestamp,finishedAt:timestamp,physicalSeconds:num.min(0),evaluation}).refine(b=>b.finishedAt>=b.startedAt,'Fechas de preparación inválidas.').refine(validEvents,'Eventos de preparación inválidos.');
const saved=z.object({id,title:text.min(1),config:configSchema,createdAt:timestamp});
const bag=z.object({id,name:text.min(1),roaster:text,country:text,region:text,producer:text,variety:text,process:text,roast:text,roastedAt:text,openedAt:text,initialWeight:positive.max(100000),price:num.min(0).nullable(),currency:text,notes:text,photo:z.string().max(3000000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).nullable(),archived:z.boolean()});
const preferences=z.object({advanced:z.boolean(),theme:z.enum(['dark','light']),sound:z.boolean(),unit:z.enum(['C','F']),experience:text,scale:z.boolean(),grinder:z.boolean(),flavor:text,methods:z.array(method),reduceMotion:z.boolean()});
const active=z.object({...rhythm,stepPhysicalStartedAt:timestamp.optional(),waterChoice:z.object({stepIndex:num.int().min(0).max(19),strategy:z.enum(['recipe','target'])}).optional(),id,config:configSchema,startedAt:timestamp,stepStartedAt:timestamp,stepIndex:num.int().min(0),pausedAt:timestamp.nullable(),status:z.enum(['brewing','review']),finishedAt:timestamp.nullable(),physicalSeconds:num.min(0).nullable(),evaluation}).refine(a=>a.stepIndex<a.config.recipe.steps.length,'Paso activo inválido.').refine(validEvents,'Eventos de preparación inválidos.');
const duel=z.object({id,createdAt:timestamp,archived:z.boolean().optional(),coffee:z.string().max(100),a:configSchema,b:configSchema,aBrewId:id.nullable(),bBrewId:id.nullable(),result:z.object({choice:z.enum(['a','b','same']),note:z.string().max(1000),at:timestamp}).nullable()}).refine(validDuelPlan,'El reto debe cambiar solo el ratio.').refine(d=>!d.aBrewId||d.aBrewId!==d.bBrewId,'Las tazas deben ser distintas.');
const storeSchema=z.object({version:z.literal(1),duels:z.array(duel).max(10000).optional(),cuppings:z.array(cuppingSchema.refine(s=>s.finishedAt!==null)).max(10000).optional(),activeCupping:cuppingSchema.refine(s=>s.finishedAt===null).nullable().optional(),recipes:z.array(saved).max(10000).optional(),preferences,bags:z.array(bag).max(10000),brews:z.array(brew).max(100000),favorites:z.array(method),active:active.nullable(),activeBagId:id.nullable()});
export type ImportPayload={kind:'backup';data:Store}|{kind:'recipe';data:SavedRecipe};
function validateLinks(s:Store){
 for(const records of [s.bags,s.brews,s.recipes||[],s.cuppings||[],s.duels||[]])if(new Set(records.map(x=>x.id)).size!==records.length)throw new Error('El archivo contiene identificadores duplicados.');
 for(const b of s.brews)if(b.config.bagId&&!s.bags.some(x=>x.id===b.config.bagId))throw new Error('Falta una bolsa relacionada con el historial.');
 for(const d of s.duels||[])if(d.a.bagId&&!s.bags.some(b=>b.id===d.a.bagId))throw new Error('Falta la bolsa del reto.');
 for(const b of s.bags)if(remaining(b,s.brews)<0)throw new Error(`El historial supera el peso de la bolsa «${b.name}». Revisa la copia.`);
}
export function parseImport(raw:string):ImportPayload{
 if(new TextEncoder().encode(raw).length>25*1024*1024)throw new Error('Usa un archivo de hasta 25 MB.');
 let value:unknown;try{value=JSON.parse(raw)}catch{throw new Error('El archivo no es un JSON válido. Tus datos siguen intactos.')}
 const wrapper=z.object({format:z.enum(['better-mood-backup','better-mood-recipe']),version:z.literal(1),data:z.unknown()}).safeParse(value);
 if(wrapper.success&&wrapper.data.format==='better-mood-recipe'){
  const result=saved.safeParse(wrapper.data.data);if(!result.success)throw new Error('La receta está incompleta o contiene cantidades inválidas.');
  return {kind:'recipe',data:{...result.data,config:{...result.data.config,bagId:null}}};
 }
 const result=storeSchema.safeParse(wrapper.success?wrapper.data.data:value);
 if(!result.success)throw new Error('Esta copia está incompleta, dañada o usa una versión no compatible.');
 validateLinks(result.data);return {kind:'backup',data:result.data};
}
export function backupFile(s:Store){return {format:'better-mood-backup',version:1,data:s}}
export function recipeFile(r:SavedRecipe){return {format:'better-mood-recipe',version:1,data:{id:r.id,title:r.title,createdAt:r.createdAt,config:{...structuredClone(r.config),bagId:null}}}}
const same=(a:unknown,b:unknown):boolean=>{if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;const x=a as Record<string,unknown>,y=b as Record<string,unknown>;const keys=Object.keys(x).filter(k=>x[k]!==undefined).sort();return JSON.stringify(keys)===JSON.stringify(Object.keys(y).filter(k=>y[k]!==undefined).sort())&&keys.every(k=>same(x[k],y[k]))};
export function planImport(current:Store,payload:ImportPayload){
 const next=structuredClone(current);const stats={duels:0,cuppings:0,bags:0,brews:0,recipes:0,duplicates:0,conflicts:0,skipped:0};const conflictBagIds=new Set<string>();
 const merge=<T extends {id:string}>(local:T[],incoming:T[],key:'bags'|'brews'|'recipes'|'cuppings'|'duels')=>{const out=[...local];for(const item of incoming){const exists=out.find(x=>x.id===item.id);if(exists){if(same(exists,item))stats.duplicates++;else{stats.conflicts++;if(key==='bags')conflictBagIds.add(item.id)}}else{out.push(structuredClone(item));stats[key]++}}return out};
 if(payload.kind==='recipe')next.recipes=merge(next.recipes||[],[payload.data],'recipes');
 else{
  next.cuppings=merge(next.cuppings||[],payload.data.cuppings||[],'cuppings');
  next.bags=merge(next.bags,payload.data.bags,'bags');
  const safeBrews=payload.data.brews.filter(b=>{if(b.config.bagId&&conflictBagIds.has(b.config.bagId)&&!next.brews.some(x=>x.id===b.id)){stats.skipped++;return false}return true});
  next.brews=merge(next.brews,safeBrews,'brews').sort((a,b)=>b.startedAt-a.startedAt);
  next.recipes=merge(next.recipes||[],payload.data.recipes||[],'recipes');
  const safeDuels=(payload.data.duels||[]).filter(d=>{if(d.a.bagId&&conflictBagIds.has(d.a.bagId)&&!next.duels?.some(x=>x.id===d.id)){stats.skipped++;return false}return true});
  next.duels=merge(next.duels||[],safeDuels,'duels');
  next.favorites=[...new Set([...next.favorites,...payload.data.favorites])];
 }
 validateLinks(next);
 return {next,stats,ignoredActive:payload.kind==='backup'&&!!(payload.data.active||payload.data.activeCupping)};
}
export function downloadJson(value:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
