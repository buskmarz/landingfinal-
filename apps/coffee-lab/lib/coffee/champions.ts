import { RECIPES, defaultConfig, type Recipe } from './domain.ts';
const base=RECIPES.find(r=>r.id==='v60')!;
export const CHAMPION_RECIPES: {id:string;person:string;title:string;context:string;status:string;recipe:Recipe}[]=[
 {id:'tetsu-46',person:'Tetsu Kasuya',title:'Cinco vertidos. Un ritmo.',context:'Campeón mundial Brewers Cup · 2016',status:'Receta publicada por HARIO',recipe:{...base,label:'V60 · Tetsu Kasuya',subtitle:'4:6 · versión publicada por HARIO',dose:20,ratio:15,temperature:92,grind:'Gruesa',version:1,equipment:['V60 cerámico y filtro enjuagado','Báscula, jarra y hervidor','20 g de café de molienda gruesa'],note:'Versión publicada por HARIO, no identificada aquí como la rutina exacta ganadora de 2016. La fuente da el agua en ml; usamos 1 ml ≈ 1 g para guiar la báscula. Cambiar dosis o ratio crea una adaptación; el tiempo no escala linealmente.',source:{name:'HARIO · Tetsu Kasuya',url:'https://www.hario-europe.com/blogs/hario-community/v60-ambassadors-tetsu-kasuya',status:'Receta del campeón publicada por HARIO'},steps:[
 {title:'Primer vertido · 0:00',instruction:'Humedece todo el café. Deja drenar antes del siguiente vertido.',seconds:45,fraction:50/300},
 {title:'Segundo vertido · 0:45',instruction:'Completa la primera parte del método 4:6.',seconds:45,fraction:70/300},
 {title:'Tercer vertido · 1:30',instruction:'Vierte suavemente sobre el café.',seconds:40,fraction:60/300},
 {title:'Cuarto vertido · 2:10',instruction:'Repite el vertido manteniendo el control del flujo.',seconds:30,fraction:60/300},
 {title:'Último vertido · 2:40',instruction:'Completa el agua y deja drenar. Retira el V60 a las 3:30 aproximadamente.',seconds:50,fraction:60/300},
 ]}},
 {id:'ole-switch',person:'Ole Kristian Bøen',title:'Abre. Cierra. Descubre.',context:'Campeón nacional de Noruega · 2020',status:'Rutina del mundial 2021 · no ganadora mundial',recipe:{...base,name:'HARIO Switch',equipmentVariant:'switch',label:'Switch · Ole Kristian Bøen',subtitle:'Inmersión + filtrado · requiere válvula',dose:16.5,ratio:240/16.5,temperature:96,grind:'Media-fina',version:1,minDose:10,maxDose:25,capacity:300,equipment:['HARIO Switch 02 con válvula funcional','Filtro enjuagado, báscula y jarra','16.5 g de café y agua a 96 °C'],note:'Necesitas un Switch 02: un V60 convencional no puede cerrar el flujo. HARIO documenta esta receta usada en el mundial 2021; no dice que ganara ese mundial. Tiempo final de 3:00 a 3:15. Si personalizas, será tu adaptación.',source:{name:'HARIO · Ole Kristian Bøen',url:'https://www.hario-europe.com/blogs/hario-community/ole-kristian-boens-switch-recipe',status:'Receta usada en World Brewers Cup 2021'},steps:[
 {title:'Cierra · 0:00',instruction:'Cierra la válvula, añade el agua y deja humedecer 40 segundos.',seconds:40,fraction:50/240},
 {title:'Abre · 0:40',instruction:'Abre la válvula y vierte directamente en el centro.',seconds:50,fraction:100/240},
 {title:'Cierra · 1:30',instruction:'Cierra la válvula. Vierte en círculos.',seconds:40,fraction:90/240},
 {title:'Abre · 2:10',instruction:'Abre la válvula y deja drenar. Finaliza entre 3:00 y 3:15 aproximadamente.',seconds:65},
 ]}},
];
export const championConfig=(id:string)=>{const entry=CHAMPION_RECIPES.find(r=>r.id===id);if(!entry)throw new Error('Receta desconocida.');return defaultConfig(entry.recipe)};
