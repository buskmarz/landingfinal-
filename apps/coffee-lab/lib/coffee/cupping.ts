import { z } from 'zod';
import type { Store } from './domain.ts';

export const CUPPING_SOURCE='https://sca.coffee/s/AW_SCA-102_Sample-Preparation_281024_Secured.pdf';
export const CUPPING_VERSION='SCA-102 · 2024';
const time=z.number().finite().nonnegative().max(8640000000000000);
export const cupSchema=z.object({
 id:z.string().min(1).max(200),sample:z.string().min(1).max(100),code:z.string().min(1).max(12),
 phase:z.number().int().min(0).max(8),pouredAt:time.nullable(),brokenAt:time.nullable(),
 fragrance:z.string().max(1000),aroma:z.string().max(1000).optional(),rounds:z.array(z.string().max(1000)).length(3),
}).superRefine((c,ctx)=>{
 if((c.phase>=2)!==(c.pouredAt!==null)||(c.phase>=3)!==(c.brokenAt!==null)||
 (c.pouredAt!==null&&c.brokenAt!==null&&c.brokenAt-c.pouredAt<180000))ctx.addIssue({code:'custom',message:'Secuencia de taza inválida.'});
});
export const cuppingSchema=z.object({
 id:z.string().min(1).max(200),version:z.literal(1),protocol:z.enum(['practice','cva']),
 volume:z.number().int().min(200).max(350),cupsPerSample:z.union([z.literal(1),z.literal(3),z.literal(5)]),
 blind:z.boolean(),createdAt:time,finishedAt:time.nullable(),lastActionAt:time.optional(),clockNeedsCheck:z.boolean().optional(),cups:z.array(cupSchema).min(1).max(30),
}).superRefine((s,ctx)=>{
 const samples=new Set(s.cups.map(c=>c.sample));
 if((s.protocol==='practice'?s.cupsPerSample!==1:![3,5].includes(s.cupsPerSample))||samples.size>6||
 [...samples].some(name=>s.cups.filter(c=>c.sample===name).length!==s.cupsPerSample)||
 new Set(s.cups.map(c=>c.id)).size!==s.cups.length||new Set(s.cups.map(c=>c.code)).size!==s.cups.length||
 s.cups.some(c=>(c.pouredAt!==null&&c.pouredAt<s.createdAt)||(s.finishedAt!==null&&c.brokenAt!==null&&c.brokenAt>s.finishedAt))||
 (s.lastActionAt!==undefined&&(s.lastActionAt<s.createdAt||s.cups.some(c=>(c.brokenAt??c.pouredAt??s.createdAt)>s.lastActionAt!)))||
 (s.finishedAt!==null&&(s.finishedAt<(s.lastActionAt??s.createdAt)||s.cups.some(c=>c.phase!==8))))ctx.addIssue({code:'custom',message:'Mesa de catación inválida.'});
});
export type CuppingSession=z.infer<typeof cuppingSchema>;
export type CuppingCup=z.infer<typeof cupSchema>;
export function cuppingDose(volume:number){if(!Number.isFinite(volume)||volume<200||volume>350)throw new Error('Usa un recipiente de 200 a 350 ml.');return Math.round(volume*.055*10)/10;}
export function cupElapsed(c:CuppingCup,now:number){return c.pouredAt===null||!Number.isFinite(now)?0:Math.max(0,Math.floor((now-c.pouredAt)/1000));}
export function breakWindow(c:CuppingCup,now:number){const seconds=cupElapsed(c,now);return c.pouredAt===null?'dry':seconds<180?'wait':seconds<=300?'ready':'late';}
export function cupBlocker(session:CuppingSession,cup:CuppingCup){
 if(cup.phase===1&&session.cups.some(c=>c.phase===0))return 'Huele primero todas las tazas en seco. Elige la siguiente arriba.';
 if(cup.phase===3&&session.cups.some(c=>c.phase<3))return 'Rompe primero las costras de las demás tazas. Elige la siguiente arriba.';
 return null;
}
export function createCupping(input:{protocol:'practice'|'cva';volume:number;cupsPerSample:1|3|5;blind:boolean;names:string[]},now=Date.now()):CuppingSession{
 const names=input.names.map(n=>n.trim());
 if(names.some(n=>!n)||new Set(names).size!==names.length)throw new Error('Da un nombre diferente a cada café.');
 // Fisher–Yates with Web Crypto: codes hide identities, never imply a certified blind test.
 if(input.blind)for(let i=names.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[names[i],names[j]]=[names[j],names[i]];}
 return cuppingSchema.parse({id:crypto.randomUUID(),version:1,protocol:input.protocol,volume:input.volume,cupsPerSample:input.cupsPerSample,blind:input.blind,createdAt:now,finishedAt:null,cups:names.flatMap((sample,i)=>Array.from({length:input.cupsPerSample},(_,j)=>({id:crypto.randomUUID(),sample,code:`${String.fromCharCode(65+i)}${j+1}`,phase:0,pouredAt:null,brokenAt:null,fragrance:'',rounds:['','','']})))});
}
export function latestCuppingTime(session:CuppingSession){return Math.max(session.createdAt,session.lastActionAt??0,...session.cups.map(c=>c.brokenAt??c.pouredAt??0))}
export function advanceCup(session:CuppingSession,id:string,now=Date.now(),expectedPhase?:number):CuppingSession{
 if(session.finishedAt!==null)return session;
 if(session.clockNeedsCheck)throw new Error('Revisa la hora del dispositivo antes de continuar.');
 if(!Number.isFinite(now)||now<latestCuppingTime(session))throw new Error('Revisa la fecha y hora del dispositivo.');
 const target=session.cups.find(c=>c.id===id);if(!target||target.phase===8||(expectedPhase!==undefined&&target.phase!==expectedPhase))return session;
 return {...session,lastActionAt:now,cups:session.cups.map(c=>{
  if(c.id!==id||c.phase===8)return c;
  const blocker=cupBlocker(session,c);if(blocker)throw new Error(blocker);
  if(c.phase===2&&breakWindow(c,now)==='wait')throw new Error('Espera al menos 3 minutos antes de romper la costra.');
  return {...c,phase:c.phase+1,pouredAt:c.phase===1?now:c.pouredAt,brokenAt:c.phase===2?now:c.brokenAt};
 })};
}
export function finishCupping(store:Store,now=Date.now()):Store{
 const session=store.activeCupping;if(!session)return store;
 if(session.cups.some(c=>c.phase!==8))throw new Error('Completa las tres rondas de todas las tazas.');
 if(session.clockNeedsCheck)throw new Error('Revisa la hora del dispositivo antes de guardar.');
 const finished=cuppingSchema.parse({...session,finishedAt:now});
 return {...store,activeCupping:null,cuppings:[...(store.cuppings||[]).filter(s=>s.id!==session.id),finished]};
}
export const CUP_PHASES=[
 {title:'Huele el café seco',instruction:'Muele cada taza por separado. Acerca la nariz y describe su fragancia.',action:'Ya olí el café',next:'Añadir agua'},
 {title:'Añade el agua',instruction:'Usa agua a 93 ± 3 °C. Vierte suavemente hasta el borde. Pulsa al empezar a verter.',action:'Empiezo a verter',next:'Reposar de 3 a 5 min'},
 {title:'Rompe la costra',instruction:'Entre 3 y 5 min, aparta la costra con unas 3 pasadas de cuchara. Acerca la nariz y huele.',action:'Costra rota',next:'Retirar espuma'},
 {title:'Limpia la superficie',instruction:'Retira espuma y partículas con una o dos cucharas. Descártalas. Enjuaga las cucharas entre tazas.',action:'Superficie limpia',next:'Dejar enfriar'},
 {title:'Deja enfriar',instruction:'Comienza cerca de 70 °C. Comprueba la temperatura; el reloj no la mide. Si quema, espera.',action:'Temperatura comprobada',next:'Primera ronda'},
 {title:'Primera ronda',instruction:'Prueba una pequeña cantidad sin quemarte. Describe sabor, acidez y sensación en boca.',action:'Guardar ronda 1',next:'Volver a probar más fría'},
 {title:'Segunda ronda',instruction:'Deja enfriar y prueba otra vez. ¿Aparece algo nuevo? Compara con la primera ronda.',action:'Guardar ronda 2',next:'Última ronda al enfriarse'},
 {title:'Tercera ronda',instruction:'Continúa hasta que esté por debajo de la temperatura corporal. Observa lo que permanece.',action:'Completar taza',next:'Comparar resultados'},
 {title:'Taza completa',instruction:'Termina las demás tazas para comparar lo que encontraste.',action:'Lista',next:'Guardar la cata'},
] as const;
