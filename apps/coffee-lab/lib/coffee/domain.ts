import type { Duel } from './duel.ts';
import type { CuppingSession } from './cupping.ts';
import { z } from 'zod';
export const BRAND={name:'Better Mood Coffee Lab',short:'Better Mood',tagline:'Bienestar real en taza'};
export type MethodId='v60'|'aeropress'|'french'|'chemex'|'kalita'|'moka'|'espresso'|'cold';
export type Step={title:string;instruction:string;seconds:number;fraction?:number;manual?:boolean};
export type Recipe={equipmentVariant?:'switch';source?:{name:string;url:string;status:string};label?:string;id:MethodId;name:string;subtitle:string;family:string;description:string;dose:number;ratio:number;temperature:number;grind:string;equipment:string[];steps:Step[];minDose:number;maxDose:number;minRatio:number;maxRatio:number;capacity:number;note:string;difficulty:string;version:number};
export const RECIPES:Recipe[]=[
{id:'v60',name:'V60',subtitle:'Limpio · delicado',family:'FILTRADO MANUAL',description:'Una taza limpia, dulce y con mucho por descubrir.',dose:18,ratio:16,temperature:93,grind:'Media-fina',equipment:['V60 y filtro enjuagado','Jarra y báscula','Café molido y agua caliente'],minDose:10,maxDose:40,minRatio:12,maxRatio:18,capacity:500,difficulty:'Intermedio',version:1,note:'Para un V60 tamaño 02. Las dosis grandes pueden necesitar otro tamaño; el tiempo no escala de forma lineal.',steps:[{title:'Humedece el café',instruction:'Humedece todo el café y mueve suavemente el dripper.',seconds:40,fraction:0.2},{title:'Primer vertido',instruction:'Vierte despacio en círculos pequeños, evitando las paredes.',seconds:45,fraction:0.4},{title:'Completa el vertido',instruction:'Mantén un flujo suave y constante.',seconds:45,fraction:0.4},{title:'Deja filtrar',instruction:'Espera a que termine el drenado. Retira el dripper y mezcla la bebida.',seconds:50}]},
{id:'aeropress',name:'AeroPress',subtitle:'Versátil · suave',family:'INMERSIÓN Y PRESIÓN',description:'Una preparación versátil, de textura suave y sabor redondo.',dose:15,ratio:15,temperature:90,grind:'Media-fina',equipment:['AeroPress en posición normal','Filtro enjuagado y taza resistente','Café molido y agua caliente'],minDose:10,maxDose:22,minRatio:10,maxRatio:17,capacity:250,difficulty:'Fácil',version:1,note:'Receta en posición normal. Respeta la capacidad de tu modelo y presiona suavemente sobre una superficie estable.',steps:[{title:'Añade el agua',instruction:'Con el filtro colocado y la cámara sobre la taza, añade el café y el agua.',seconds:25,fraction:1},{title:'Mezcla y espera',instruction:'Remueve suavemente y coloca el émbolo sin presionar.',seconds:75},{title:'Presiona suavemente',instruction:'Presiona de forma constante. Detente si encuentras demasiada resistencia.',seconds:30,manual:true}]},
{id:'french',name:'Prensa francesa',subtitle:'Cuerpo · textura',family:'INMERSIÓN',description:'Una taza de cuerpo amplio, con textura y aromas persistentes.',dose:25,ratio:15,temperature:94,grind:'Media-gruesa',equipment:['Prensa francesa','Báscula y cuchara','Café molido y agua caliente'],minDose:15,maxDose:60,minRatio:12,maxRatio:18,capacity:800,difficulty:'Fácil',version:1,note:'Comprueba la capacidad de tu prensa. Sirve la bebida al terminar para evitar mantenerla en contacto con el café.',steps:[{title:'Sumerge el café',instruction:'Añade el agua y humedece todo el café.',seconds:30,fraction:1},{title:'Deja reposar',instruction:'Coloca la tapa sin bajar el émbolo y espera.',seconds:210},{title:'Baja y sirve',instruction:'Baja el émbolo despacio, sin forzarlo. Sirve todo el café.',seconds:30,manual:true}]},
{id:'chemex',name:'Chemex',subtitle:'Ligero · aromático',family:'FILTRADO MANUAL',description:'Una taza delicada y brillante para compartir sin prisa.',dose:30,ratio:16,temperature:94,grind:'Media-gruesa',equipment:['Chemex de 6 tazas','Filtro enjuagado','Báscula y agua caliente'],minDose:20,maxDose:50,minRatio:13,maxRatio:18,capacity:700,difficulty:'Intermedio',version:1,note:'Coloca el lado de tres capas del filtro hacia el pico. Si el drenado se ralentiza demasiado, revisa filtro y molienda.',steps:[{title:'Humedece el café',instruction:'Humedece todo el lecho de café.',seconds:45,fraction:.2},{title:'Primer vertido',instruction:'Vierte en círculos suaves manteniendo espacio libre en el filtro.',seconds:60,fraction:.4},{title:'Segundo vertido',instruction:'Completa el agua de la receta sin desbordar el filtro.',seconds:60,fraction:.4},{title:'Filtra y comparte',instruction:'Espera a que drene, retira el filtro y mezcla suavemente la bebida.',seconds:75}]},
{id:'kalita',name:'Kalita Wave',subtitle:'Dulce · uniforme',family:'FILTRADO MANUAL',description:'Un punto de partida dulce y equilibrado, con vertidos pequeños.',dose:20,ratio:16,temperature:93,grind:'Media',equipment:['Kalita Wave 185','Filtro de ondas enjuagado','Jarra y báscula'],minDose:15,maxDose:35,minRatio:13,maxRatio:18,capacity:500,difficulty:'Intermedio',version:1,note:'Pensada para tamaño 185. Evita aplastar las ondas del filtro.',steps:[{title:'Humedece el café',instruction:'Humedece el café de manera uniforme.',seconds:40,fraction:.2},{title:'Primer pulso',instruction:'Vierte despacio sobre el centro del lecho.',seconds:40,fraction:.3},{title:'Segundo pulso',instruction:'Mantén una altura de agua moderada.',seconds:40,fraction:.25},{title:'Último pulso',instruction:'Completa el agua y deja filtrar.',seconds:60,fraction:.25}]},
{id:'moka',name:'Moka',subtitle:'Intenso · clásico',family:'EXTRACCIÓN EN ESTUFA',description:'El ritual clásico de una taza intensa y aromática.',dose:18,ratio:10,temperature:20,grind:'Media-fina, no espresso',equipment:['Moka y estufa compatibles','Café para llenar la canasta sin compactar','Agua hasta debajo de la válvula'],minDose:10,maxDose:40,minRatio:5,maxRatio:15,capacity:400,difficulty:'Intermedio',version:1,note:'Las cantidades las determina tu cafetera: no escales la moka con el ratio. Sigue sus instrucciones; nunca tapes la válvula ni compactes el café.',steps:[{title:'Llena y monta',instruction:'Con la cafetera fría, añade agua sin cubrir la válvula. Llena la canasta de café al ras, sin prensar, y cierra bien.',seconds:60,manual:true},{title:'Calienta con suavidad',instruction:'Pon a fuego medio-bajo. Mantén el asa lejos del fuego y observa la salida del café.',seconds:180,manual:true},{title:'Retira del calor',instruction:'Cuando el flujo se aclare y comience a borbotear, retira del fuego con protección y sirve.',seconds:30,manual:true}]},
{id:'espresso',name:'Espresso',subtitle:'Denso · concentrado',family:'EXTRACCIÓN A PRESIÓN',description:'Una bebida concentrada. Ajusta la molienda a tu café y tu máquina.',dose:18,ratio:2,temperature:93,grind:'Fina, ajustar en el molinillo',equipment:['Máquina y portafiltro calientes','Canasta adecuada a la dosis','Molinillo, tamper y báscula'],minDose:12,maxDose:22,minRatio:1,maxRatio:3,capacity:80,difficulty:'Avanzado',version:1,note:'El ratio relaciona café seco y bebida obtenida. 25–35 s es una referencia, no una regla. Detén la extracción según tu objetivo de peso.',steps:[{title:'Extrae tu espresso',instruction:'Inicia la bomba al iniciar la guía. Detén manualmente la bomba cuando alcances el peso de bebida objetivo; después finaliza aquí.',seconds:30,manual:true}]},
{id:'cold',name:'Cold brew',subtitle:'Frío · pausado',family:'INMERSIÓN EN FRÍO',description:'Una bebida suave preparada lentamente en refrigeración.',dose:60,ratio:10,temperature:4,grind:'Gruesa',equipment:['Recipiente limpio con tapa','Filtro','Agua potable y refrigerador'],minDose:20,maxDose:120,minRatio:8,maxRatio:15,capacity:1500,difficulty:'Fácil',version:1,note:'Mantén el recipiente refrigerado. Puedes diluir al servir según tu gusto. El temporizador web no garantiza avisos con la app cerrada.',steps:[{title:'Mezcla y refrigera',instruction:'Añade el agua, humedece todo el café y tapa el recipiente. Guárdalo en el refrigerador.',seconds:60,fraction:1,manual:true},{title:'Extracción en frío',instruction:'Deja reposar en refrigeración durante unas 12 horas. Vuelve para consultar el tiempo transcurrido.',seconds:43200},{title:'Filtra y sirve',instruction:'Filtra el café. Sirve frío y ajusta con agua al gusto; conserva refrigerado.',seconds:60,manual:true}]}
];
export type Config={recipe:Recipe;dose:number;ratio:number;temperature:number;grind:string;bagId:string|null};
export function defaultConfig(r:Recipe):Config{return {recipe:structuredClone(r),dose:r.dose,ratio:r.ratio,temperature:r.temperature,grind:r.grind,bagId:null}}
export function totalWater(c:Config){return Math.round(c.dose*c.ratio)}
export function targets(c:Config){let cumulative=0;const total=totalWater(c);return c.recipe.steps.map(s=>{const before=Math.round(cumulative*total);cumulative+=(s.fraction||0);const after=Math.round(cumulative*total);return {add:after-before,total:after}})}
export function configError(c:Config){const r=c.recipe;if(!Number.isFinite(c.dose)||c.dose<r.minDose||c.dose>r.maxDose)return `La dosis debe estar entre ${r.minDose} y ${r.maxDose} g.`;if(!Number.isFinite(c.ratio)||c.ratio<r.minRatio||c.ratio>r.maxRatio)return 'Revisa el ratio para este método.';if(r.id!=='moka'&&totalWater(c)>r.capacity)return `Esta receta excede la capacidad orientativa de ${r.capacity} g. Reduce la dosis o el ratio.`;return null}
export type Evaluation={rating:number;again:boolean;tags:string[];notes:string;sweet:number;acid:number;bitter:number;body:number;astringency:number;output:number|null};
export const EMPTY_EVAL:Evaluation={rating:0,again:true,tags:[],notes:'',sweet:3,acid:3,bitter:3,body:3,astringency:1,output:null};
export type BrewEvent={stepIndex:number;startedAt:number;endedAt:number;completed:boolean;actualTotal?:number;waterChoice?:'recipe'|'target'};
export type Rhythm={mode?:'guided'|'paced';events?:BrewEvent[]};
export type Active=Rhythm & {stepPhysicalStartedAt?:number;id:string;config:Config;startedAt:number;stepStartedAt:number;stepIndex:number;pausedAt:number|null;status:'brewing'|'review';finishedAt:number|null;physicalSeconds:number|null;waterChoice?:{stepIndex:number;strategy:'recipe'|'target'};evaluation:Evaluation};
export type Brew=Rhythm & {id:string;config:Config;startedAt:number;finishedAt:number;physicalSeconds:number;evaluation:Evaluation};
export type Bag={id:string;name:string;roaster:string;country:string;region:string;producer:string;variety:string;process:string;roast:string;roastedAt:string;openedAt:string;initialWeight:number;price:number|null;currency:string;notes:string;photo:string|null;archived:boolean};
export type Preferences={advanced:boolean;theme:'dark'|'light';sound:boolean;unit:'C'|'F';experience:string;scale:boolean;grinder:boolean;flavor:string;methods:string[];reduceMotion:boolean};
export type SavedRecipe={id:string;title:string;config:Config;createdAt:number};
export type Store={duels?:Duel[];cuppings?:CuppingSession[];activeCupping?:CuppingSession|null;recipes?:SavedRecipe[];version:1;preferences:Preferences;bags:Bag[];brews:Brew[];favorites:string[];active:Active|null;activeBagId:string|null};
export function emptyStore():Store{return {version:1,preferences:{advanced:false,theme:'dark',sound:false,unit:'C',experience:'Explorando',scale:true,grinder:true,flavor:'Equilibrado',methods:[],reduceMotion:false},bags:[],brews:[],favorites:[],active:null,activeBagId:null}}
export function remaining(b:Bag,brews:Brew[]){return +(b.initialWeight-brews.filter(x=>x.config.bagId===b.id).reduce((s,x)=>s+x.config.dose,0)).toFixed(1)}
export function tick(a:Active,now:number):Active{if(a.mode==='paced'||a.pausedAt!==null||a.status!=='brewing')return a;let i=a.stepIndex,at=a.stepStartedAt;while(i<a.config.recipe.steps.length-1&&!a.config.recipe.steps[i].manual&&now-at>=a.config.recipe.steps[i].seconds*1000){at+=a.config.recipe.steps[i].seconds*1000;i++}return i===a.stepIndex?a:{...a,stepIndex:i,stepStartedAt:at}}
export function saveBrew(s:Store,a:Active):Store{if(s.brews.some(b=>b.id===a.id))return {...s,active:null};if(a.finishedAt===null||a.physicalSeconds===null)throw new Error('Finaliza la preparación antes de guardar.');return {...s,active:null,brews:[{id:a.id,config:structuredClone(a.config),startedAt:a.startedAt,finishedAt:a.finishedAt,physicalSeconds:a.physicalSeconds,evaluation:structuredClone(a.evaluation),...(a.mode?{mode:a.mode}:{}),...(a.events?{events:structuredClone(a.events)}:{})},...s.brews]}}
export function clock(seconds:number){seconds=Math.max(0,Math.floor(seconds));return seconds>=3600?`${Math.floor(seconds/3600)}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}
export function minutes(r:Recipe){const sec=r.steps.reduce((s,x)=>s+x.seconds,0);return sec>=3600?`${+(sec/3600).toFixed(1)} h`:sec<60?`${sec} s`:`${Math.floor(sec/60)}${sec%60?':'+String(sec%60).padStart(2,'0'):''} min`}
export function temperature(c:number,unit:'C'|'F'){return `${unit==='F'?Math.round(c*9/5+32):c} °${unit}`}

export const configInputSchema=z.object({method:z.enum(['v60','aeropress','french','chemex','kalita','moka','espresso','cold']),dose:z.number().positive().optional(),ratio:z.number().positive().optional()}).strict();

export function customRecipeError(c:Config){
 const base=configError(c);if(base)return base;
 if(!Number.isFinite(c.temperature)||c.temperature<0||c.temperature>100)return 'Revisa la temperatura: 0 a 100 °C.';
 if(c.recipe.steps.length<1||c.recipe.steps.length>20)return 'Usa entre 1 y 20 pasos.';
 for(const step of c.recipe.steps){if(!step.title.trim()||!step.instruction.trim())return 'Completa el nombre y la indicación de cada paso.';if(!Number.isFinite(step.seconds)||step.seconds<1||step.seconds>86400)return 'Cada paso debe durar entre 1 segundo y 24 horas.';if(!Number.isFinite(step.fraction??0)||(step.fraction??0)<0||(step.fraction??0)>1)return 'Revisa el porcentaje de agua de cada paso.'}
 const sum=c.recipe.steps.reduce((a,s)=>a+(s.fraction||0),0);
 if(['espresso','moka'].includes(c.recipe.id)){if(sum!==0)return 'Este método no usa porcentajes de vertido.';if(c.recipe.steps.some(s=>!s.manual))return 'En este método, avanza los pasos manualmente.'}
 else if(Math.abs(sum-1)>.000001)return 'Reparte el 100 % del agua entre los pasos.';
 return null;
}
export function compareBrews(a:Brew,b:Brew){
 const rows=[
 {label:'Método',a:a.config.recipe.name,b:b.config.recipe.name,variable:true},
 {label:'Café de la bolsa',a:a.config.bagId,b:b.config.bagId,variable:!!a.config.bagId&&!!b.config.bagId},
 {label:'Café (g)',a:a.config.dose,b:b.config.dose,variable:true},
 {label:'Ratio',a:a.config.ratio,b:b.config.ratio,variable:true},
 {label:'Temperatura (°C)',a:a.config.temperature,b:b.config.temperature,variable:true},
 {label:'Molienda',a:a.config.grind,b:b.config.grind,variable:true},
 {label:'Tiempo real',a:a.physicalSeconds,b:b.physicalSeconds,variable:true},
 {label:'Pasos',a:JSON.stringify(a.config.recipe.steps),b:JSON.stringify(b.config.recipe.steps),variable:true},
 {label:'Valoración',a:a.evaluation.rating,b:b.evaluation.rating,variable:false}
 ];
 return {rows:rows.map(r=>({...r,changed:r.label==='Café de la bolsa'&&(!r.a||!r.b)?false:r.a!==r.b})),changedVariables:rows.filter(r=>r.variable&&r.a!==r.b).length,unknownBeans:!a.config.bagId||!b.config.bagId};
}

/** Confirmed physical events only. A paused guide does not stop extraction. */
export function confirmStep(a:Active,expectedStep:number,now:number,actualTotal?:number,finishEarly=false):Active {
 if(a.status!=='brewing'||a.stepIndex!==expectedStep||a.pausedAt!==null)return a;
 const start=a.stepPhysicalStartedAt??a.stepStartedAt;
 if(!Number.isFinite(now)||now<start)throw new Error('Revisa la hora del dispositivo.');
 const hasWeight=targets(a.config)[a.stepIndex].add>0||a.config.recipe.id==='espresso';
 if(actualTotal!==undefined&&(!hasWeight||!Number.isFinite(actualTotal)||actualTotal<0||actualTotal>100000))throw new Error('Revisa el peso indicado.');
 const priorWeight=[...(a.events||[])].reverse().find(e=>e.actualTotal!==undefined)?.actualTotal;
 if(actualTotal!==undefined&&priorWeight!==undefined&&actualTotal<priorWeight)throw new Error('Anota el peso acumulado, sin volver a tarar.');
 const events=a.mode==='paced'?[...(a.events||[]),{stepIndex:a.stepIndex,startedAt:start,endedAt:now,completed:!finishEarly,...(a.waterChoice?.stepIndex===a.stepIndex?{waterChoice:a.waterChoice.strategy}:{}),...(actualTotal!==undefined?{actualTotal}:{})}]:a.events;
 const last=a.stepIndex===a.config.recipe.steps.length-1;
 if(last||finishEarly)return {...a,...(events?{events}:{}),status:'review',finishedAt:now,physicalSeconds:Math.max(0,Math.floor((now-a.startedAt)/1000))};
 return {...a,...(events?{events}:{}),stepIndex:a.stepIndex+1,stepStartedAt:now,stepPhysicalStartedAt:now,pausedAt:null};
}

export function pourPlan(a:Active){
 const list=targets(a.config),planned=list[a.stepIndex];
 const previousPour=list.findLastIndex((x,i)=>i<a.stepIndex&&x.add>0);
 const event=a.events?.find(e=>e.stepIndex===previousPour&&e.actualTotal!==undefined);
 const difference=event?.actualTotal===undefined?0:event.actualTotal-list[previousPour].total;
 return {planned, difference,adjusted:Math.max(0,Math.round((planned.add-difference)*10)/10),canChoose:planned.add>0&&difference!==0&&a.mode==='paced'};
}
