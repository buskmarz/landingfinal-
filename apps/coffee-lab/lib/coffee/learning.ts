import type { MethodId } from './domain';
export type MethodStory={milestone:string;history:string;source:string;sourceName:string;how:[string,string,string];tryIt:string};
export const METHOD_STORIES:Record<MethodId,MethodStory>={
 v60:{milestone:'2005 · Lanzamiento',history:'HARIO lanzó el V60 en 2005. Su forma cónica lleva el agua al centro.',source:'https://www.hario-europe.com/pages/nf-about-the-v60-dripper',sourceName:'HARIO Europe',how:['Coloca y enjuaga el filtro.','Humedece el café y vierte por etapas.','Deja drenar y mezcla la bebida.'],tryIt:'Observa si mojas todo el café en el primer vertido.'},
 aeropress:{milestone:'2005 · Presentación',history:'Alan Adler presentó AeroPress en Seattle en 2005, tras más de treinta prototipos.',source:'https://aeropress.com/pages/about',sourceName:'AeroPress',how:['Apoya la cámara sobre una taza resistente.','Añade café y agua; mezcla y espera.','Presiona suavemente, sin forzar el émbolo.'],tryIt:'Antes de preparar, comprueba que la taza y la cámara estén estables.'},
 french:{milestone:'1974 · Un hito de BODUM',history:'BODUM presentó su primera prensa, la Bistro, en 1974. El método ya existía.',source:'https://www.bodum.com/gb/en/about',sourceName:'BODUM · Historia',how:['Sumerge todo el café en agua.','Deja reposar sin bajar el émbolo.','Baja despacio y sirve la bebida.'],tryIt:'Sirve al terminar para separar la bebida del café molido.'},
 chemex:{milestone:'1941 · Diseño y patente',history:'Peter Schlumbohm diseñó y patentó la CHEMEX en 1941. El mismo vidrio sostiene el filtro y recibe el café.',source:'https://chemexcoffeemaker.com/pages/about-us',sourceName:'CHEMEX · Nuestra historia',how:['Coloca las tres capas hacia el pico.','Humedece el café y vierte sin desbordar.','Retira el filtro y mezcla la bebida.'],tryIt:'Revisa la colocación del filtro antes de verter agua.'},
 kalita:{milestone:'1958 · Origen de la marca',history:'Kalita nació en Tokio en 1958. Es la fecha de la marca, no la del filtro Wave.',source:'https://www.kalita.co.jp/company/history.php',sourceName:'Kalita · Cronología',how:['Coloca el filtro sin aplastar sus ondas.','Humedece el café y vierte por pulsos.','Deja filtrar y retira el dripper.'],tryIt:'Mira las ondas del filtro después de colocarlo: deben conservar su forma.'},
 moka:{milestone:'1933 · Moka Express',history:'Alfonso Bialetti creó la Moka Express en 1933. Su diseño de ocho lados llevó el café de estufa a muchos hogares.',source:'https://www.bialetti.co.nz/pages/history-heritage',sourceName:'Bialetti · Historia',how:['Agua bajo la válvula; café sin compactar.','Calienta con suavidad y observa la salida.','Retira con protección y sirve.'],tryIt:'Con la moka fría, localiza la válvula y el límite de llenado.'},
 espresso:{milestone:'1938 · Patente de Gaggia',history:'En 1938, Achille Gaggia solicitó la patente del sistema Lampo, que usaba agua a presión en lugar de vapor.',source:'https://www.gaggia.com/our-history/',sourceName:'Gaggia · Nuestra historia',how:['Pesa, distribuye y compacta tu dosis.','Inicia la bomba y observa la báscula.','Detén la bomba al alcanzar tu objetivo.'],tryIt:'Distingue la dosis seca del peso de bebida obtenido.'},
 cold:{milestone:'Década de 1960 · Toddy',history:'El sistema Toddy apareció en 1964. Es un hito comercial, no el origen de toda la extracción en frío.',source:'https://toddycafe.com/downloads/toddy-capabilities-statement-4-2021.pdf',sourceName:'Toddy · Historia del sistema',how:['Mezcla café y agua en un recipiente limpio.','Tapa y conserva en refrigeración.','Filtra y sirve; conserva refrigerado.'],tryIt:'Anota la hora de inicio y vuelve a consultar el tiempo real.'}
};
type TechniqueLesson={
 id:'water'|'grind'|'ratio'|'acidity'|'experiment';
 title:string;
 summary:string;
 body:string;
 tip?:string;
 steps?:string[];
 source?:{label:string;url:string};
};
export const TECHNIQUES:TechniqueLesson[]=[
 {
  id:'water',
  title:'Prueba otra agua',
  summary:'Dos aguas, la misma receta.',
  body:'Los minerales disueltos pueden cambiar cómo se extrae el café. El bicarbonato puede moderar la acidez que percibes.',
  steps:['Elige dos aguas potables que ya tengas.','Usa el mismo café, dosis, molienda y temperatura. Cambia solo el agua.','Prueba ambas tazas a temperatura similar y anota cuál prefieres.'],
  source:{label:'Hendon y colaboradores · 2014',url:'https://researchportal.bath.ac.uk/en/publications/the-role-of-dissolved-cations-in-coffee-extraction/'},
 },
 {
  id:'grind',
  title:'Describe tu molienda',
  summary:'Guarda equipo y ajuste.',
  body:'El tamaño de partícula influye en cómo el agua pasa por el café y en lo que extrae. Los números de distintos molinillos no equivalen.',
  tip:'Anota el modelo y el ajuste. Prueba un cambio pequeño y compara el tiempo y el sabor.',
  source:{label:'UC Davis · Estudio de café filtrado',url:'https://www.nature.com/articles/s41598-020-73341-4'},
 },
 {id:'ratio',title:'Entiende el ratio',summary:'Agua por cada gramo de café.',body:'En filtrado, 1:16 significa 16 g de agua añadida por cada gramo de café. En espresso, 1:2 relaciona café seco y bebida en taza. Agua añadida y bebida obtenida no son lo mismo.',tip:'18 g × 16 = 288 g de agua añadida.'},
 {id:'acidity',title:'Reconoce la acidez',summary:'Puede ser parte de lo que disfrutas.',body:'La acidez puede recordar a frutas o cítricos. Distingue lo que disfrutas de lo que resulta desequilibrado. Una etiqueta de sabor no basta para identificar la causa.',tip:'Describe algo concreto: mandarina, manzana o cacao.'},
 {id:'experiment',title:'Cambia una variable',summary:'Compara sin perder tu receta.',body:'Mantén el café y el equipo. Prueba cambiar solo ratio, molienda, temperatura o técnica. Repite para observar consistencia; una preferencia no demuestra causalidad.',tip:'Guarda ambas tazas y usa Comparar en el historial.'},
];
