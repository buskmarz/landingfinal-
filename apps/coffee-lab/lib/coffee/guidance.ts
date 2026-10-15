import { RECIPES,defaultConfig,customRecipeError,type MethodId,type Brew,type Config } from './domain.ts';
export type Taste='suave'|'intenso'|'cuerpo'|'aromatico';
const styles:Record<Taste,MethodId[]>={suave:['aeropress','cold','chemex'],intenso:['espresso','moka'],cuerpo:['french','moka'],aromatico:['v60','chemex','kalita']};
export function selectRecipe(equipment:MethodId[],time:number,taste:Taste){
 const owned=RECIPES.filter(r=>equipment.includes(r.id));const options=owned.filter(r=>r.steps.reduce((s,p)=>s+p.seconds,0)/60+2<=time);
 const ranked=options.sort((a,b)=>Number(styles[taste].includes(b.id))-Number(styles[taste].includes(a.id)));
 return {recipe:ranked[0]||null,reason:!owned.length?'Selecciona el equipo que tienes.':!ranked.length?'Tu equipo necesita más tiempo para estas recetas. Amplía el tiempo disponible.':`Para tu ${ranked[0].name}: ${ranked[0].description.charAt(0).toLowerCase()+ranked[0].description.slice(1)}`,matchesTaste:!!ranked[0]&&styles[taste].includes(ranked[0].id)};
}
export function coach(b:Brew):{observation:string;reason:string;change:string;watch:string;kind:'ratio'|'repeat';config:Config;changed:boolean}{
 const c=structuredClone(b.config);const intense=b.evaluation.tags.includes('Muy intenso');
 if(intense&&!['moka','espresso'].includes(c.recipe.id)){
  const next=+(c.ratio+.5).toFixed(1);const candidate={...c,ratio:next};
  if(!customRecipeError(candidate))return {observation:'Te pareció muy intenso.',reason:'Intensidad y amargor son sensaciones distintas. Más agua por dosis puede reducir la concentración; el resultado también depende de la extracción.',change:`Prueba 1:${next} en lugar de 1:${c.ratio}. Mantén dosis, molienda y temperatura.`,watch:'Comprueba si se siente menos concentrado y si conserva el cuerpo que disfrutas.',kind:'ratio',config:{...candidate,recipe:{...candidate.recipe,label:`${candidate.recipe.name} · prueba 1:${next}`,version:candidate.recipe.version+1}},changed:true};
 }
 const astringent=b.evaluation.tags.includes('Astringente');
 return {observation:astringent?'Notaste una sensación seca.':intense?'Te pareció muy intenso.':b.evaluation.rating>=4?'Esta taza te gustó.':'Todavía estamos conociendo tu café.',reason:astringent?'La etiqueta por sí sola no identifica la causa. Influyen técnica, café y molienda.':intense?'En esta receta, un cambio automático podría alterar la extracción o superar la capacidad.':'Repetir te ayuda a saber si el resultado es consistente.',change:'Repite las mismas cantidades y anota tu molienda y técnica.',watch:'Compara el sabor antes de cambiar una variable. Puedes editar una copia para experimentar.',kind:'repeat',config:c,changed:false};
}
export function recipeLink(c:Config,origin:string){const url=new URL('/coffee-lab/',origin);url.hash=new URLSearchParams({method:c.recipe.id,dose:String(c.dose),ratio:String(c.ratio)}).toString();return url.toString()}
export function configFromHash(hash:string){const p=new URLSearchParams(hash.replace(/^#/,''));const r=RECIPES.find(r=>r.id===p.get('method'));if(!r)return null;const c=defaultConfig(r);if(p.has('dose'))c.dose=Number(p.get('dose'));if(p.has('ratio'))c.ratio=Number(p.get('ratio'));if(customRecipeError(c))throw new Error('El enlace contiene cantidades inválidas.');return c}
