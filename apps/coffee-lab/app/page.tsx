'use client';
import { attachDuelBrew, type Duel, type DuelSide } from '@/lib/coffee/duel';
import { CoffeeMenu, CoffeePrivacy } from '@/components/coffee-visit';
import { CoffeeLabBoundary } from '@/components/coffee-lab-boundary';
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import {  Coffee, ArrowLeft, ArrowLeftRight, ArrowRight, ListCheck, Settings2, Play,   Clock3,  Sparkles,   Plus,   Check,  RotateCcw, Download, Trash2, Search, Pencil,     ChevronRight,   CheckCircle2, WifiOff } from 'lucide-react';
import { Sidebar, SidebarProvider, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Toaster, toast } from 'sonner';
import { RecipeEditor,BrewComparison } from '@/components/coffee-extras';
import { BagForm,Choice,PreferencesForm,RatingForm } from '@/components/coffee-forms';
import { RECIPES,EMPTY_EVAL,defaultConfig,emptyStore,totalWater,configError,customRecipeError,remaining,brewBagIssue,tick,confirmStep,saveBrew,clock,minutes,temperature,configInputSchema,type SavedRecipe,type Store,type Config,type Brew,type Active,type Bag,type Evaluation } from '@/lib/coffee/domain';
import { GuidedChoice,ImportData,EquipmentGuide } from '@/components/coffee-upgrade';
import { coach as recommendation,configFromHash } from '@/lib/coffee/guidance';
import { backupFile,recipeFile,planImport,type ImportPayload } from '@/lib/coffee/transfer';
import { MethodList } from '@/components/coffee-methods';
import { BrewBagPicker } from '@/components/brew-bag-picker';
import { RecipeSetup } from '@/components/coffee-setup';
const CoffeeLaboratory=lazy(()=>import('@/components/coffee-laboratory'));
import { BrewTimeline } from '@/components/coffee-timeline';
import { useBrewAudio } from '@/hooks/use-brew-audio';
import { audioMode, audioPreferences, type BrewAudioMode } from '@/lib/coffee/brew-voice';
import { BrewAudioChoice } from '@/components/brew-audio-choice';
import { BrewFocus } from '@/components/coffee-focus';
import { repository } from '@/lib/coffee/storage';
const CoffeeChat=lazy(()=>import('@/components/coffee-chat'));
const Coffee3D=lazy(()=>import('@/components/coffee-3d'));
import { syncNativeBrews } from '@/lib/coffee/native-activity';
import { listenForNativeMethod } from '@/lib/coffee/native-links';
import { exportJson } from '@/lib/coffee/native-transfer';
import { LabIcon } from '@/components/lab-icon';
import { useRecipeLibrary } from '@/hooks/use-recipe-library';
import { hasCloudAccount } from '@/lib/coffee/cloud-account';
import { deviceConnectionCode } from '@/lib/coffee/account-device';
import { CoffeeActivity, NextCup } from '@/components/coffee-activity';
import { dayKey, daysSinceDate, favoriteBrew } from '@/lib/coffee/activity';
const NAV = [
 { id: 'home', label: 'Inicio', icon: 'home' },
 { id: 'prepare', label: 'Preparar', icon: 'brew' },
 { id: 'beans', label: 'Mis cafés', icon: 'collection' },
 { id: 'learn', label: 'Laboratorio', icon: 'lab' },
 { id: 'history', label: 'Actividad', icon: 'activity' },
] as const;
type Page = typeof NAV[number]['id'];
const MOBILE_NAV = NAV.filter(item => item.id !== 'prepare').map(item =>
 item.id === 'home' ? { ...item, label: 'Preparar', icon: 'brew' as const } : item
);

const CoffeeAccount=lazy(()=>import('@/components/coffee-account'));
export default function Home(){
 const [state,setState]=useState<Store>(emptyStore);const [loaded,setLoaded]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [page,setPage]=useState<Page>('home');const [config,setConfig]=useState<Config>(()=>defaultConfig(RECIPES[0]));const [dialog,setDialog]=useState<'settings'|'bag'|'check'|'3d'|'recipe'|'guide'|'import'|'menu'|'privacy'|null>(null);const [editingBag,setEditingBag]=useState<Bag|undefined>();const [editingBrew,setEditingBrew]=useState<Brew|null>(null);const [confirm,setConfirm]=useState<{title:string;body:string;action:()=>Promise<void>}|null>(null);const [checks,setChecks]=useState<boolean[]>([]);const [now,setNow]=useState(()=>Date.now());const [search,setSearch]=useState('');const [methodFilter,setMethodFilter]=useState('all');const [ratingFilter,setRatingFilter]=useState('all');const [dateFilter,setDateFilter]=useState('');const [online,setOnline]=useState(true);const [offlineReady,setOfflineReady]=useState(false);
 const librarySync=useRecipeLibrary(state,setState);
 const [recipeDraft,setRecipeDraft]=useState<Config|null>(null);const [savedEditingId,setSavedEditingId]=useState<string|null>(null);const [comparisonIds,setComparisonIds]=useState<string[]>([]);const [comparisonOpen,setComparisonOpen]=useState(false);
 const [showSetup,setShowSetup]=useState(false);const [brewMode,setBrewMode]=useState<'guided'|'paced'>('guided');
 const [methodBagId,setMethodBagId]=useState<string|null>(null);
 const [labTab,setLabTab]=useState('cupping');const [pendingDuel,setPendingDuel]=useState<{id:string;side:DuelSide}|null>(null);
 const [cuppingUnsaved,setCuppingUnsaved]=useState(false);
 const [reviewDraft,setReviewDraft]=useState<{id:string;evaluation:Evaluation}|null>(null);
 const workspaceRef=useRef<HTMLElement>(null);
 const checklistLauncher=useRef<HTMLElement|null>(null);
 const stateRef=useRef(state);const lock=useRef(false);useEffect(()=>{stateRef.current=state},[state]);
 const commit=useCallback(async(fn:(s:Store)=>Store)=>{try{const next=await repository.update(fn);setState(next);setError('');return next}catch(e){const message=e instanceof Error?e.message:'No se pudo guardar.';setError(message);toast.error(message);throw e}},[]);
 const action=useCallback(async(fn:()=>Promise<unknown>)=>{if(lock.current)return;lock.current=true;setBusy(true);try{await fn()}catch{}finally{lock.current=false;setBusy(false)}},[]);
 useEffect(()=>{repository.read().then(s=>{setState(s);if(s.active){setShowSetup(true);setPage('prepare');}else if(s.activeCupping){setPage('learn');}else if(s.bar?.some(Boolean)){setLabTab('bar');setPage('learn');}setConfig(c=>({...c,bagId:s.activeBagId}));setLoaded(true)}).catch(e=>setError(e.message));const refreshClock=()=>{if(stateRef.current.active)setNow(Date.now())};const t=setInterval(refreshClock,350);document.addEventListener('visibilitychange',refreshClock);window.addEventListener('focus',refreshClock);window.addEventListener('pageshow',refreshClock);const net=()=>setOnline(navigator.onLine);net();window.addEventListener('online',net);window.addEventListener('offline',net);return()=>{clearInterval(t);document.removeEventListener('visibilitychange',refreshClock);window.removeEventListener('focus',refreshClock);window.removeEventListener('pageshow',refreshClock);window.removeEventListener('online',net);window.removeEventListener('offline',net)}},[]);
 useEffect(()=>{document.documentElement.dataset.theme=state.preferences.theme;document.documentElement.dataset.motion=state.preferences.reduceMotion?'reduced':'full'},[state.preferences.theme,state.preferences.reduceMotion]);
 useEffect(()=>{if(loaded&&(deviceConnectionCode(location.search)||(hasCloudAccount()&&new URLSearchParams(location.search).get('coffee_oauth')==='1')))setDialog('settings')},[loaded]);
 useEffect(()=>{if(!('serviceWorker' in navigator)||process.env.NODE_ENV!=='production')return;let disposed=false;navigator.serviceWorker.register('/coffee-lab/sw.js',{scope:'/coffee-lab/'}).then(async reg=>{await navigator.serviceWorker.ready;if(disposed)return;const sync=()=>{(reg.active||navigator.serviceWorker.controller)?.postMessage({type:'CACHE_URLS',urls:[...new Set(performance.getEntriesByType('resource').map(x=>x.name).filter(x=>x.startsWith(location.origin+'/coffee-lab/'))) ]})};sync();window.addEventListener('load',sync,{once:true})}).catch(()=>{});const receive=(e:MessageEvent)=>{if(e.data?.type==='OFFLINE_READY')setOfflineReady(true)};navigator.serviceWorker.addEventListener('message',receive);return()=>{disposed=true;navigator.serviceWorker.removeEventListener('message',receive)}},[]);
 const active=state.active;const recipe=config.recipe;const water=totalWater(config);const configIssue=customRecipeError(config);const bag=state.bags.find(b=>b.id===config.bagId);const brewIssue=configIssue||brewBagIssue(state,config);const last=state.brews[0];
 const preparationView=page==='prepare'?(active?.status??(showSetup?'recipe':'methods')):null;
 useEffect(()=>{
  if(preparationView&&document.activeElement===document.body){
   workspaceRef.current?.querySelector<HTMLElement>('[data-preparation-heading]')?.focus({preventScroll:true});
  }
 },[preparationView]);
 useEffect(()=>{if(!active||active.status!=='brewing')return;const next=tick(active,now);if(next.stepIndex!==active.stepIndex)void commit(s=>s.active?.id===active.id?{...s,active:tick(s.active,Date.now())}:s).catch(()=>{})},[now,active,commit]);
 const brewAudioMode=audioMode(state.preferences);
 const brewAudio=useBrewAudio(active,now,brewAudioMode);
 const changeAudioMode=(mode:BrewAudioMode)=>{
  if(mode!=='off')brewAudio.unlock();
  void commit(s=>({...s,preferences:{...s.preferences,...audioPreferences(mode)}})).catch(()=>{});
 };

 useEffect(()=>{if(!active||active.status!=='brewing')return;let sentinel:{release:()=>Promise<void>}|undefined;const wake=async()=>{if(document.hidden)return;try{const n=navigator as Navigator&{wakeLock?:{request:(s:string)=>Promise<{release:()=>Promise<void>}>}};sentinel=await n.wakeLock?.request('screen')}catch{}};void wake();document.addEventListener('visibilitychange',wake);return()=>{void sentinel?.release();document.removeEventListener('visibilitychange',wake)}},[active?.id,active?.status]);
 useEffect(()=>{if(loaded)syncNativeBrews(active,state.bar)},[loaded,active,state.bar]);
 const editRecipe=(c:Config,saved?:SavedRecipe)=>{setRecipeDraft(structuredClone(c));setSavedEditingId(saved?.id||null);setDialog('recipe')};
 const methodBag=page==='prepare'?state.bags.find(b=>b.id===methodBagId&&!b.archived):undefined;
 const choose=(r:typeof recipe)=>{setConfig({...defaultConfig(r),bagId:methodBag?.id??state.activeBagId});setChecks([]);setShowSetup(true);setPage('prepare');window.scrollTo({top:0,behavior:'instant'})};
 const repeat=useCallback((brew:Brew,adjust=false)=>{
  const advice=recommendation(brew);
  const nextConfig=adjust?advice.config:structuredClone(brew.config);
  if(!stateRef.current.bags.some(bag=>bag.id===nextConfig.bagId&&!bag.archived))nextConfig.bagId=null;
  setConfig(nextConfig);
  setShowSetup(true);
  setPage('prepare');
  window.scrollTo({top:0,behavior:'instant'});
  toast.success(adjust&&advice.changed?'Ajuste aplicado a una copia. La taza anterior se conserva.':'Receta lista para revisar y repetir.');
 },[]);
 const toggleFav=(id:string)=>void action(()=>commit(s=>({...s,favorites:s.favorites.includes(id)?s.favorites.filter(x=>x!==id):[...s.favorites,id]})));
 const start=()=>void action(async()=>{if(brewIssue)throw new Error(brewIssue);if(state.preferences.sound)brewAudio.unlock();const at=Date.now();await commit(s=>{if(s.active||s.activeCupping)throw new Error('Ya hay una preparación o cata en curso.');const bagIssue=brewBagIssue(s,config);if(bagIssue)throw new Error(bagIssue);const session:Active={id:crypto.randomUUID(),config:structuredClone(config),mode:brewMode,...(brewMode==='paced'?{events:[]}:{}),startedAt:at,stepStartedAt:at,stepPhysicalStartedAt:at,stepIndex:0,pausedAt:null,status:'brewing',finishedAt:null,physicalSeconds:null,evaluation:{...EMPTY_EVAL,tags:[]}};return pendingDuel?attachDuelBrew(s,pendingDuel.id,pendingDuel.side,session):{...s,active:session}});setPendingDuel(null);setDialog(null);setShowSetup(true);setPage('prepare')});
 const patchActive=(fn:(a:Active)=>Active)=>{setNow(Date.now());void action(()=>commit(s=>s.active?{...s,active:fn(s.active)}:s))};
 const finish=(weight?:number)=>patchActive(a=>confirmStep(a,active?.stepIndex??-1,Date.now(),weight,a.stepIndex<a.config.recipe.steps.length-1));
 function updateReview(id:string,evaluation:Evaluation){
  if(lock.current)return;
  setReviewDraft({id,evaluation});
  void commit(s=>s.active?.id===id&&s.active.status==='review'
   ?{...s,active:{...s.active,evaluation}}
   :s).catch(()=>{});
 }
 const save=()=>void action(async()=>{
  if(active?.status!=='review')return;
  const {id}=active;
  const draft=reviewDraft?.id===id?reviewDraft.evaluation:undefined;
  const duelBrew=state.duels?.some(d=>d.aBrewId===id||d.bBrewId===id);
  const next=await commit(s=>s.active?.id===id&&s.active.status==='review'
   ?saveBrew(s,{...s.active,evaluation:draft??s.active.evaluation})
   :s);
  if(!next.brews.some(b=>b.id===id))return;
  setReviewDraft(null);
  if(duelBrew){setLabTab('duel');setPage('learn');window.scrollTo({top:0,behavior:'instant'})}
  else setPage('history');
  const usedBag=next.bags.find(b=>b.id===active.config.bagId);
  toast.success(usedBag?`Taza guardada. Quedan ${remaining(usedBag,next.brews)} g de ${usedBag.name}.`:'Taza guardada.');
 });
 const addRecipeBag=()=>{setEditingBag(undefined);setDialog('bag')};
 const saveBag=(bag:Bag)=>void action(async()=>{
  const forRecipe=page==='prepare'&&!editingBag;
  const reviewId=forRecipe&&active?.status==='review'?active.id:null;
  await commit(s=>{
   const used=s.brews.reduce((sum,b)=>b.config.bagId===bag.id?sum+b.config.dose:sum,0);
   if(bag.initialWeight<used)throw new Error(`El peso inicial no puede ser menor a los ${used} g ya registrados.`);
   const bags=s.bags.some(b=>b.id===bag.id)?s.bags.map(b=>b.id===bag.id?bag:b):[...s.bags,bag];
   const current=s.active;
   const applyToReview=current&&current.id===reviewId&&current.status==='review';
   return {...s,bags,activeBagId:s.activeBagId||bag.id,
    active:applyToReview?{...current,config:{...current.config,bagId:bag.id}}:current};
  });
  if(!reviewId)setConfig(c=>({...c,bagId:forRecipe?bag.id:c.bagId||bag.id}));
  setDialog(null);
  toast.success('Café guardado en tu colección.');
 });
 const exportData=()=>void exportJson(backupFile(state),`better-mood-copia-${new Date().toISOString().slice(0,10)}.json`).then(saved=>{if(saved)toast.success('Copia preparada.')}).catch(e=>toast.error(e.message||'No se pudo exportar.'));
 const shareRecipe=(r:SavedRecipe)=>void exportJson(recipeFile(r),'better-mood-receta.json').then(saved=>{if(saved)toast.success('Receta preparada. Sin datos privados.')}).catch(e=>toast.error(e.message||'No se pudo compartir.'));
 const importData=async(payload:ImportPayload)=>{if(lock.current)return;lock.current=true;setBusy(true);try{await commit(s=>{if(s.active)throw new Error('Termina tu preparación antes de importar.');return planImport(s,payload).next});setDialog(null);toast.success('Importación completada. Tus datos anteriores se conservan.')}finally{lock.current=false;setBusy(false)}};
 useEffect(()=>{
  if(!loaded)return;
  const follow=()=>{
   if(stateRef.current.active||stateRef.current.activeCupping)return;
   try{
    const linkedConfig=configFromHash(location.hash);
    if(linkedConfig){setConfig(linkedConfig);setShowSetup(true);setPage('prepare')}
   }catch(error){toast.error(error instanceof Error?error.message:'Enlace inválido.')}
  };
  follow();
  window.addEventListener('hashchange',follow);
  const removeNative=listenForNativeMethod(hash=>{
   const current=stateRef.current;
   if(hash==='#bar'){
    if(cuppingUnsaved){toast.error('Guarda o copia tu nota antes de cambiar de pantalla.');return;}
    setLabTab('bar');setPage('learn');window.scrollTo(0,0);return;
   }
   if(hash==='#brew'||hash==='#repeat'){
    if(current.active){setPage('prepare');window.scrollTo(0,0);return}
    if(hash==='#brew'||current.activeCupping)return;
    if(current.bar?.some(Boolean)){setLabTab('bar');setPage('learn');window.scrollTo(0,0);return}
    const latest=current.brews.reduce<Brew|undefined>((newest,brew)=>!newest||brew.finishedAt>newest.finishedAt?brew:newest,undefined);
    if(latest){repeat(latest);return}
    setShowSetup(false);
    setPage('prepare');
    window.scrollTo(0,0);
    toast.info('Guarda una preparación para repetirla desde el widget.');
    return;
   }
   if(!current.active&&!current.activeCupping){location.hash=hash;follow()}
  });
  return()=>{removeNative();window.removeEventListener('hashchange',follow)};
 },[loaded,repeat,cuppingUnsaved]);
 useEffect(()=>{const ctx=(document as Document&{modelContext?:{registerTool:(tool:unknown,opts:unknown)=>void}}).modelContext;if(!ctx?.registerTool)return;const controller=new AbortController();try{ctx.registerTool({name:'ritual_read_lab',description:'Read local coffee methods and counts; does not start or save a brew.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:async()=>({methods:RECIPES.map(r=>({id:r.id,name:r.name})),brews:stateRef.current.brews.length,bags:stateRef.current.bags.length,active:stateRef.current.active?.status||null})},{signal:controller.signal});ctx.registerTool({name:'ritual_configure_recipe',description:'Stage a recipe in the visible preparation screen. Does not start the timer or consume inventory.',inputSchema:{type:'object',properties:{method:{type:'string',enum:RECIPES.map(r=>r.id)},dose:{type:'number'},ratio:{type:'number'}},required:['method'],additionalProperties:false},execute:async(input:unknown)=>{const v=configInputSchema.parse(input);if(stateRef.current.active||stateRef.current.activeCupping)throw new Error('Finish the active preparation or tasting first.');const c=defaultConfig(RECIPES.find(r=>r.id===v.method)!);if(v.dose!==undefined)c.dose=v.dose;if(v.ratio!==undefined)c.ratio=v.ratio;const err=configError(c);if(err)throw new Error(err);setConfig(c);setShowSetup(true);setPage('prepare');await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return {method:c.recipe.name,dose:c.dose,ratio:c.ratio,water:totalWater(c),status:'configured'}}},{signal:controller.signal})}catch{}return()=>controller.abort()},[]);
 const navigate=(p:Page)=>{if(cuppingUnsaved){toast.error('Guarda o copia tu nota antes de cambiar de pantalla.');return;}setMethodBagId(null);if(p==='prepare')setShowSetup(false);setPage(p);window.scrollTo({top:0,behavior:'instant'})};
 const currentPage=NAV.find(n=>n.id===page)!;
 const restoreChecklistFocus=(event:Event)=>{
  const launcher=checklistLauncher.current;
  checklistLauncher.current=null;
  const heading=workspaceRef.current?.querySelector<HTMLElement>('.brew-focus [data-preparation-heading]');
  const target=heading??(launcher?.isConnected&&launcher!==document.body?launcher:null);
  if(!target)return;
  event.preventDefault();
  target.focus();
 };
 const openDuel=(d:Duel,side:DuelSide)=>{if(state.active||state.activeCupping)return;const launcher=document.activeElement;checklistLauncher.current=launcher instanceof HTMLElement?launcher:null;setConfig(structuredClone(d[side]));setBrewMode('paced');setPendingDuel({id:d.id,side});setChecks(d[side].recipe.equipment.map(()=>false));setDialog('check')};
 const openChecklist=()=>{setPendingDuel(null);if(state.activeCupping){toast.info('Termina tu cata antes de preparar otra receta.');setPage('learn');return;}setChecks(recipe.equipment.map(()=>false));checklistLauncher.current=workspaceRef.current?.querySelector<HTMLElement>('.setup-start')??null;setDialog('check')};
 const a=active;
 const brewingBag=a?.config.bagId?state.bags.find(b=>b.id===a.config.bagId):undefined;
 const isDuelCup=!!a&&state.duels?.some(d=>d.aBrewId===a.id||d.bBrewId===a.id);
 const reviewBalanceLow=a&&brewingBag&&remaining(brewingBag,state.brews)<a.config.dose;
 const sessionView=!a?null:a.status==='review'?<div className="review-layout"><section className="completion-visual"><CheckCircle2 size={32}/><h1 tabIndex={-1} data-preparation-heading>Tu café está listo.</h1><p>{brewingBag&&brewingBag.name+' · '}{a.config.recipe.name} · {a.config.dose} g · {clock(a.physicalSeconds||0)}</p></section><section className="panel"><h2>¿Cómo te supo?</h2><BrewTimeline brew={a}/><RatingForm value={reviewDraft?.id===a.id?reviewDraft.evaluation:a.evaluation} advanced={state.preferences.advanced} onChange={v=>updateReview(a.id,v)}/>{!isDuelCup&&<BrewBagPicker config={a.config} bags={state.bags} brews={state.brews} busy={busy} onAddBag={addRecipeBag}
  onSelect={bagId=>void action(()=>commit(s=>s.active?.id===a.id&&s.active.status==='review'
   ?{...s,active:{...s.active,config:{...s.active.config,bagId}}}:s))}/>}
 {reviewBalanceLow&&<p className="error-note" role="alert">El saldo de esta bolsa es menor que la dosis utilizada.</p>}
 <button className="primary wide" disabled={busy||!!reviewBalanceLow} onClick={save}><Check size={18}/>{busy?'Guardando…':'Guardar preparación'}</button><button className="text-button wide" onClick={()=>setConfirm({title:'¿Descartar esta preparación?',body:'No se registrará en tu historial ni se descontará café.',action:async()=>{await commit(s=>({...s,active:null}));setPage('home')}})}>Descartar sin guardar</button></section></div>:<BrewFocus active={a} bagName={brewingBag?.name} now={now} busy={busy} audioMode={brewAudioMode} onAudioMode={changeAudioMode} onRepeatAudio={brewAudio.repeat} onWaterChoice={strategy=>patchActive(x=>({...x,waterChoice:{stepIndex:x.stepIndex,strategy}}))} onLeave={()=>navigate('home')} onPause={()=>{if(a.pausedAt!==null&&state.preferences.sound)brewAudio.unlock();patchActive(x=>x.pausedAt!==null?{...x,stepStartedAt:x.stepStartedAt+(Date.now()-x.pausedAt),pausedAt:null}:{...x,pausedAt:Date.now()})}} onAdvance={weight=>patchActive(x=>confirmStep(x,a.stepIndex,Date.now(),weight))} onFinish={finish} onCancel={()=>setConfirm({title:'¿Cancelar tu preparación?',body:'No se guardará ni se descontará café.',action:async()=>{await commit(s=>({...s,active:null}));setShowSetup(true);setPage('prepare')}})}/>;
 const selectedBrews=comparisonIds.map(id=>state.brews.find(b=>b.id===id)).filter((b):b is Brew=>!!b);
 const filteredBrews=state.brews.filter(b=>(methodFilter==='all'||b.config.recipe.id===methodFilter)&&(ratingFilter==='all'||b.evaluation.rating>=Number(ratingFilter))&&(!dateFilter||dayKey(new Date(b.startedAt))===dateFilter)&&[b.config.recipe.name,state.bags.find(x=>x.id===b.config.bagId)?.name,b.evaluation.notes,...b.evaluation.tags].join(' ').toLowerCase().includes(search.toLowerCase()));
 return <SidebarProvider style={{'--sidebar-width':'224px'} as React.CSSProperties}><Sidebar className="ritual-sidebar"><SidebarHeader><button className="brand" onClick={()=>navigate('home')} aria-label="Better Mood Coffee Lab, inicio"><span className="brand-mark" aria-hidden="true"><img src="/coffee-lab/brand/better-mood.png" alt="" width="180" height="147"/></span><span>COFFEE LAB</span></button></SidebarHeader><SidebarContent><SidebarMenu>{NAV.map(n=><SidebarMenuItem key={n.id}><SidebarMenuButton className="nav-item" isActive={page===n.id} onClick={()=>navigate(n.id)} aria-current={page===n.id?'page':undefined}><LabIcon name={n.icon}/><span>{n.label}</span>{n.id==='prepare'&&active&&<span className="nav-badge">1</span>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter><button className="nav-item" onClick={()=>setDialog('settings')}><Settings2 size={20}/> Preferencias</button><div className="local-profile"><span>BM</span><div>Mi laboratorio<small>En este dispositivo</small></div></div></SidebarFooter></Sidebar><main ref={workspaceRef} className={"workspace "+(page==='prepare'&&active?.status==='brewing'?'is-brewing':'')}><header className="topbar"><button className="mobile-brand" onClick={()=>navigate('home')}><span className="brand-mark" aria-hidden="true"><img src="/coffee-lab/brand/better-mood.png" alt="" width="180" height="147"/></span><span><small>BETTER MOOD</small>{' '}Coffee Lab<span className="sr-only">, inicio</span></span></button><div className="breadcrumb">Mi laboratorio <span>/</span> <strong>{currentPage.label}</strong></div><div className="topbar-right">{!active&&<Suspense fallback={null}><CoffeeChat recipe={page==='prepare'&&showSetup&&!configIssue?config:undefined}/></Suspense>}<button className="cafe-return" onClick={()=>setDialog('menu')} aria-label="Cafetería"><LabIcon name="cafe"/><span>Cafetería</span></button><span className="pill">{online?<span className="status-dot"/>:<WifiOff size={12}/>} {online?'Guardado local':'Sin conexión'}</span><button className="icon-button mobile-settings" aria-label="Preferencias" onClick={()=>setDialog('settings')}><Settings2 size={17}/></button></div></header><div className={page==='home'?'main-content is-home':'main-content'}>{error&&<div role="alert" className="error-note">{error} <button className="text-button" onClick={()=>location.reload()}>Volver a cargar</button></div>}{active&&page!=='prepare'&&page!=='home'&&<button className="resume-banner" onClick={()=>navigate('prepare')}><Clock3 size={18}/>{active.status==='review'?'Tu taza está lista para guardar.':'Tienes una preparación en curso.'}<strong>Continuar</strong></button>}
 {page==='home'&&<section className="lab-home" aria-labelledby="home-heading">
  <h1 id="home-heading" className="sr-only">Preparar café</h1>
  <div className="home-actions">
   <button className="brew-cover" onClick={()=>navigate('prepare')}>
    <span>{active?.status==='review'?'Valorar mi taza':active?'Continuar preparación':'Preparar café'}</span><ArrowRight aria-hidden="true"/>
   </button>
   <div className="home-tools">
   <button className="guide-link" disabled={!!active} onClick={()=>setDialog('guide')}><ListCheck size={20} aria-hidden="true"/>Elegir método</button>
   <button className="home-shortcut" onClick={()=>{setLabTab('cupping');navigate('learn')}}>
    <LabIcon name="cupping"/><span>{state.activeCupping?'Continuar mi cata':'Catar café'}</span>
   </button>
   <button className="home-shortcut" onClick={()=>{setLabTab('duel');navigate('learn')}}>
    <ArrowLeftRight size={21} aria-hidden="true"/><span>Reto A/B</span>
   </button>
   </div>
  </div>
  {last&&<button className="last-brew" disabled={!!active} onClick={()=>repeat(last)}>
   <RotateCcw size={20} aria-hidden="true"/><span><strong>Repetir última taza</strong><small>{last.config.recipe.name} · {last.config.dose} g · 1:{last.config.ratio}</small></span><ChevronRight size={18} aria-hidden="true"/>
  </button>}
  <MethodList favorites={state.favorites} owned={state.preferences.methods} onChoose={choose} onShowAll={()=>navigate('prepare')}/>
 </section>}
 {page==='prepare'&&!active&&(showSetup?<RecipeSetup key={recipe.id} config={config} onChange={setConfig} preferences={state.preferences} bags={state.bags} brews={state.brews} favorite={state.favorites.includes(recipe.id)} onFavorite={()=>toggleFav(recipe.id)} onBack={()=>setShowSetup(false)} on3D={()=>setDialog('3d')} onStart={openChecklist} onAddBag={addRecipeBag} onEdit={()=>editRecipe(config)} busy={!loaded||busy} issue={brewIssue}/>:<section className="prepare-directory"><div className="compact-heading"><h1 tabIndex={-1} data-preparation-heading>Métodos de preparación</h1>{methodBag&&<p>{methodBag.name} · {remaining(methodBag,state.brews)} g disponibles</p>}</div><MethodList favorites={state.favorites} owned={state.preferences.methods} onChoose={choose}/><section className="saved-recipes"><div className="section-top"><h2>Mis recetas</h2><button className="subtle" onClick={()=>editRecipe(config)}><Plus size={16}/> Crear receta</button></div>{!(state.recipes||[]).length?<p className="empty-inline">Aquí se guardan tus recetas personalizadas.</p>:<div className="saved-recipe-grid">{(state.recipes||[]).map(r=><article key={r.id} className="saved-recipe-card"><p className="eyebrow">{r.config.recipe.name}</p><h3>{r.title}</h3><p className="muted">{r.config.dose} g · 1:{r.config.ratio} · {r.config.recipe.steps.length} pasos</p><div className="saved-actions"><button className="primary" onClick={()=>{setConfig({...structuredClone(r.config),bagId:methodBag?.id??state.activeBagId});setShowSetup(true);setPage('prepare');window.scrollTo({top:0,behavior:'instant'})}}>Usar receta</button><button className="icon-button" aria-label={`Compartir receta ${r.title}`} onClick={()=>shareRecipe(r)}><Download size={15}/></button><button className="icon-button" aria-label={`Editar receta ${r.title}`} onClick={()=>editRecipe(r.config,r)}><Pencil size={15}/></button><button className="icon-button" aria-label={`Eliminar receta ${r.title}`} onClick={()=>setConfirm({title:'¿Eliminar esta receta?',body:state.recipeLibrarySync?.links.some(link=>link.localId===r.id)?'Se eliminará de tus dispositivos al sincronizar. Las preparaciones guardadas se conservan.':'Las preparaciones guardadas conservarán sus propios pasos.',action:async()=>{await commit(s=>({...s,recipes:(s.recipes||[]).filter(x=>x.id!==r.id)}))}})}><Trash2 size={15}/></button></div></article>)}</div>}</section></section>)}
 {page==='prepare'&&active&&sessionView}
 {page==='beans'&&<><div className="page-heading"><div><h1>Mis cafés</h1></div>{state.bags.some(b=>!b.archived)&&<button className="primary" onClick={()=>{setEditingBag(undefined);setDialog('bag')}}><Plus size={18}/> Añadir café</button>}</div>{!state.bags.filter(b=>!b.archived).length?<div className="empty-panel"><LabIcon name="collection" width={40} height={40}/><div><h2>Tu primera bolsa</h2><p>Guarda el nombre y el peso para llevar la cuenta de cuánto café te queda.</p></div><button className="primary" onClick={()=>{setEditingBag(undefined);setDialog('bag')}}><Plus size={17}/>Añadir café</button></div>:<div className="bag-grid">{state.bags.filter(b=>!b.archived).map(b=>{const left=remaining(b,state.brews),brews=state.brews.filter(x=>x.config.bagId===b.id),best=favoriteBrew(brews),roastDays=daysSinceDate(b.roastedAt),openDays=daysSinceDate(b.openedAt);return <article className="bag-card" key={b.id}>{b.photo?<img className="bag-photo" src={b.photo} alt={b.name}/>:<div className="bag-icon"><LabIcon name="collection" width={56} height={56}/>{b.country&&<span>{b.country}</span>}</div>}<div className="section-top"><span className="eyebrow">{b.roaster||'MI COLECCIÓN'}</span><button className="icon-button" aria-label={`Editar ${b.name}`} onClick={()=>{setEditingBag(b);setDialog('bag')}}><Pencil size={15}/></button></div><h2>{b.name}</h2><p className="muted">{[b.region,b.process,b.roast].filter(Boolean).join(' · ')}</p><div className="bag-dates">{roastDays!==null&&<span>Tueste · {roastDays===0?'hoy':roastDays+' d'}</span>}{openDays!==null&&<span>Abierto · {openDays===0?'hoy':openDays+' d'}</span>}</div><div className="bag-weight"><strong>{left}<small> g</small></strong><span>de {b.initialWeight} g</span></div><Progress value={Math.max(0,left/b.initialWeight*100)}/><p className="micro">≈ {Math.max(0,Math.floor(left/config.dose))} preparaciones de {config.dose} g · {brews.length} registradas</p>{b.price!==null&&<p className="micro">Café por preparación de {config.dose} g: {(b.price/b.initialWeight*config.dose).toFixed(2)} {b.currency}</p>}{b.notes&&<details className="bag-notes"><summary>Notas</summary><p>{b.notes}</p></details>}{best&&<button className="subtle bag-best" disabled={!!active||!!state.activeCupping} onClick={()=>repeat(best)}><LabIcon name="brew"/><span>Mejor valorada · {best.config.recipe.name}</span><strong>★ {best.evaluation.rating}</strong></button>}<div className="bag-actions">
 <button className="primary" disabled={busy||left<=0||!!active||!!state.activeCupping} onClick={()=>{navigate('prepare');setMethodBagId(b.id)}}><Play size={16}/> Preparar con este café</button>
 <button className="text-button" aria-pressed={state.activeBagId===b.id} onClick={()=>void action(async()=>{await commit(s=>({...s,activeBagId:b.id}));setConfig(c=>({...c,bagId:b.id}));toast.success('Café seleccionado para tus próximas recetas.')})}>{state.activeBagId===b.id?<><Check size={16}/> Café activo</>:'Usar por defecto'}</button><button className="text-button" onClick={()=>setConfirm({title:'¿Archivar este café?',body:'Se conservará la relación con tus preparaciones anteriores.',action:async()=>{await commit(s=>({...s,bags:s.bags.map(x=>x.id===b.id?{...x,archived:true}:x),activeBagId:s.activeBagId===b.id?null:s.activeBagId}));setConfig(c=>c.bagId===b.id?{...c,bagId:null}:c)}})}>Archivar</button></div></article>})}</div>}{state.bags.some(b=>b.archived)&&<details className="archived"><summary>Cafés archivados</summary>{state.bags.filter(b=>b.archived).map(b=><div className="section-top" key={b.id}><span>{b.name}</span><button className="subtle" onClick={()=>void action(()=>commit(s=>({...s,bags:s.bags.map(x=>x.id===b.id?{...x,archived:false}:x)})))}>Restaurar</button></div>)}</details>}</>}
 {page==='history'&&<><div className="page-heading"><div><h1>Actividad</h1></div><button className="subtle" onClick={exportData}><Download size={17}/> Exportar</button></div><div className="activity-dashboard"><CoffeeActivity brews={state.brews} selected={dateFilter} onDay={setDateFilter}/>{last&&<NextCup brew={last} onTry={()=>{if(active||state.activeCupping){toast.info('Termina tu sesión activa primero.');return;}repeat(last,true)}}/>}</div>{state.brews.length>0&&<div className="history-filters"><label className="search-field"><Search size={17}/><input aria-label="Buscar en el historial" placeholder="Café, receta o nota…" value={search} onChange={e=>setSearch(e.target.value)}/></label><Choice label="Filtrar método" value={methodFilter} onChange={setMethodFilter} options={[{value:'all',label:'Todos los métodos'},...RECIPES.map(r=>({value:r.id,label:r.name}))]}/><Choice label="Filtrar valoración" value={ratingFilter} onChange={setRatingFilter} options={[{value:'all',label:'Todas las valoraciones'},{value:'4',label:'4 estrellas o más'},{value:'5',label:'5 estrellas'}]}/><input className="date-filter" type="date" aria-label="Filtrar fecha" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/>{(search||dateFilter||methodFilter!=='all'||ratingFilter!=='all')&&<button className="text-button" onClick={()=>{setSearch('');setDateFilter('');setMethodFilter('all');setRatingFilter('all')}}>Limpiar</button>}</div>}{selectedBrews.length>0&&<div className="compare-bar"><span>{selectedBrews.length} de 2 tazas elegidas</span><button className="primary" disabled={selectedBrews.length!==2} onClick={()=>setComparisonOpen(true)}>Ver diferencias</button><button className="text-button" onClick={()=>setComparisonIds([])}>Limpiar</button></div>}{!filteredBrews.length?<div className="empty-panel"><LabIcon name="activity" width={40} height={40}/><div><h2>{state.brews.length?'No hay tazas con esos filtros.':'Tu primera preparación'}</h2><p>{state.brews.length?'Prueba otro método, fecha o palabra.':'Aquí aparecerán las recetas que prepares y guardes.'}</p></div>{state.brews.length?<button className="subtle" onClick={()=>{setSearch('');setDateFilter('');setMethodFilter('all');setRatingFilter('all')}}>Limpiar filtros</button>:<button className="primary" onClick={()=>navigate('prepare')}>Preparar café</button>}</div>:<div className="history-list">{filteredBrews.map(b=>{const advice=recommendation(b);return <article className="history-card" key={b.id}><div className="history-main"><div className="history-icon"><Coffee size={24}/></div><div className="history-title"><p className="eyebrow">{new Date(b.startedAt).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}</p><h2>{b.config.recipe.name} <span>{state.bags.find(x=>x.id===b.config.bagId)?.name||'Sin bolsa asociada'}</span></h2><p className="muted">{b.config.recipe.label?b.config.recipe.label+' · ':''}{b.config.dose} g · 1:{b.config.ratio} · {temperature(b.config.temperature,state.preferences.unit)} · {clock(b.physicalSeconds)}</p></div><span className="rating-value">{b.evaluation.rating?'★ '+b.evaluation.rating:'Sin valorar'}</span></div>{b.evaluation.tags.length>0&&<div className="tag-list">{b.evaluation.tags.map(t=><span className="chip" key={t}>{t}</span>)}</div>}{b.evaluation.notes&&<p className="history-notes">{b.evaluation.notes}</p>}<BrewTimeline brew={b}/><details className="advice"><summary><Sparkles size={15}/> Para tu próxima taza <ChevronRight size={15}/></summary><p><b>Lo que notaste</b><br/>{advice.observation} {advice.reason}</p><p><b>Prueba esto</b><br/>{advice.change}</p><p><b>Qué observar</b><br/>{advice.watch}</p><p className="micro">Sugerencia orientativa basada en reglas; no es un diagnóstico de extracción.</p><button className="subtle" onClick={()=>repeat(b,true)}>{advice.changed?'Probar este ajuste':'Repetir para comparar'}</button></details><div className="history-actions"><button className={'subtle compare-select '+(comparisonIds.includes(b.id)?'active':'')} aria-pressed={comparisonIds.includes(b.id)} aria-label={`Comparar ${b.config.recipe.name} del ${new Date(b.startedAt).toLocaleString('es-MX')}`} onClick={()=>setComparisonIds(ids=>ids.includes(b.id)?ids.filter(id=>id!==b.id):ids.length<2?[...ids,b.id]:(toast.info('Ya elegiste dos tazas. Quita una para cambiarla.'),ids))}>{comparisonIds.includes(b.id)?<Check size={15}/>:<Plus size={15}/>} Comparar</button><button className="primary" onClick={()=>repeat(b)}><RotateCcw size={16}/> Repetir receta</button><button className="subtle" onClick={()=>setEditingBrew(structuredClone(b))}><Pencil size={15}/> Editar</button><button className="icon-button" aria-label={`Eliminar preparación ${b.config.recipe.name}`} onClick={()=>setConfirm({title:'¿Eliminar esta preparación?',body:'La dosis se devolverá al saldo de la bolsa asociada. Esta acción no se puede deshacer.',action:async()=>{await commit(s=>({...s,brews:s.brews.filter(x=>x.id!==b.id)}));toast.success('Preparación eliminada e inventario actualizado.')}})}><Trash2 size={16}/></button></div></article>})}</div>}</>}
 {page==='learn'&&<CoffeeLabBoundary onExit={()=>navigate('home')}><Suspense fallback={<p>Cargando laboratorio…</p>}><CoffeeLaboratory tab={labTab} setTab={setLabTab} onDuel={openDuel} onResume={()=>navigate('prepare')} state={state} commit={commit} onUnsavedChange={setCuppingUnsaved} onPrepare={c=>{if(state.activeCupping||state.active){toast.info('Termina tu sesión activa primero.');return;}setConfig({...c,bagId:state.activeBagId});setShowSetup(true);setPage('prepare');window.scrollTo({top:0,behavior:'instant'})}}/></Suspense></CoffeeLabBoundary>}
 </div></main><nav hidden={page==='prepare'&&active?.status==='brewing'} className="mobile-nav" aria-label="Navegación principal">{MOBILE_NAV.map(n=>{const selected=page===n.id||(n.id==='home'&&page==='prepare');return <button key={n.id} onClick={()=>navigate(n.id==='home'&&active?'prepare':n.id)} className={selected?'active':''} aria-current={selected?'page':undefined}><LabIcon name={n.icon}/>{n.label}</button>})}</nav>
 <Dialog open={dialog!==null} onOpenChange={open=>{if(!open)setDialog(null)}}>{dialog!==null&&<DialogContent onCloseAutoFocus={dialog==='check'?restoreChecklistFocus:undefined} className={'ritual-dialog '+(dialog==='3d'?'dialog-3d':dialog==='check'?'checklist-dialog':'')}>{dialog==='menu'?<CoffeeMenu/>:dialog==='privacy'?<CoffeePrivacy/>:<><DialogTitle>{dialog==='guide'?'Encuentra tu receta':dialog==='import'?'Importar sin perder tus datos':dialog==='settings'?'Preferencias':dialog==='bag'?(editingBag?'Editar café':'Añade tu café.'):dialog==='check'?'Prepara tu equipo.':dialog==='recipe'?(savedEditingId?'Editar receta':'Crea tu receta'):`${recipe.name} · vista 3D`}</DialogTitle><DialogDescription>{dialog==='guide'?'Tres preguntas. Sin cuenta ni registro.':dialog==='import'?'Revisa el contenido antes de añadirlo.':dialog==='settings'?'Tus preferencias se guardan en este navegador.':dialog==='bag'?'Nombre y peso son suficientes.':dialog==='check'?'Marca lo que ya tienes listo.':dialog==='recipe'?'Ajusta las cantidades y los pasos.':'Arrastra para girar. Con teclado, usa las flechas izquierda y derecha.'}</DialogDescription>{dialog==='guide'&&<GuidedChoice initial={state.preferences.methods} onChoose={c=>{setConfig({...c,bagId:state.activeBagId});setShowSetup(true);setPage('prepare');setDialog(null);window.scrollTo({top:0,behavior:'instant'})}}/>}{dialog==='import'&&<ImportData state={state} busy={busy} onImport={importData}/>}{dialog==='settings'&&<><Suspense fallback={<p>Abriendo cuenta…</p>}><CoffeeAccount state={state} onRefresh={setState} libraryStatus={librarySync.status} retryLibrary={librarySync.retry}/></Suspense><button className="text-button" onClick={()=>setDialog('privacy')}>Aviso de privacidad</button><PreferencesForm onAudioMode={changeAudioMode} value={state.preferences} onChange={v=>void commit(s=>({...s,preferences:v})).catch(()=>{})}/><details className="data-settings compact-disclosure"><summary>Copias de seguridad y datos</summary><p className="muted">Historial, cafés y fotografías se guardan solo en este navegador. Exporta una copia antes de borrar sus datos o cambiar de dispositivo.</p><p className="micro">{offlineReady?'Contenido básico disponible sin conexión.':'El modo sin conexión se prepara en la versión compilada al abrirla con internet.'} Explorar y la vista 3D requieren haberse abierto antes. Las fuentes externas necesitan internet. Al cambiar de dominio o dispositivo, exporta aquí e importa la copia en el destino.</p><button className="subtle" onClick={exportData}><Download size={17}/> Exportar mis datos</button><button className="subtle" disabled={!!active} onClick={()=>setDialog('import')}>Importar copia o receta</button><button className="text-button danger" onClick={()=>setConfirm({title:'¿Borrar todos los datos locales?',body:'Se eliminarán tus cafés, preparaciones y preferencias de este navegador. Exporta antes una copia si quieres conservarlos.',action:async()=>{await commit(()=>emptyStore());setDialog(null);setConfig(defaultConfig(RECIPES[0]));setPage('home');toast.success('Datos locales eliminados.')}})}>Borrar mis datos</button></details></>}{dialog==='bag'&&<BagForm initial={editingBag} busy={busy} onSave={saveBag}/>} {dialog==='check'&&<>{pendingDuel?<p className="notice">Taza {pendingDuel.side.toUpperCase()} · Confirma cada paso. Guardaremos los tiempos para comparar.</p>:<fieldset className="rhythm-choice"><legend>¿Cómo quieres avanzar?</legend><label><input type="radio" name="rhythm" checked={brewMode==='paced'} onChange={()=>setBrewMode('paced')}/><span><b>A mi ritmo</b><small>Confirmas cada paso y guardamos sus tiempos.</small></span></label><label><input type="radio" name="rhythm" checked={brewMode==='guided'} onChange={()=>setBrewMode('guided')}/><span><b>Con la guía</b><small>Avanza por tiempo. Confirmas los pasos manuales.</small></span></label></fieldset>}<BrewAudioChoice value={brewAudioMode} onChange={changeAudioMode}/><details className="compact-disclosure"><summary>Antes de preparar</summary><p className="notice">{recipe.note}</p></details><div className="checklist">{recipe.equipment.map((item,i)=><label key={item}><Checkbox checked={!!checks[i]} onCheckedChange={v=>setChecks(c=>c.map((x,j)=>i===j?v===true:x))}/><span>{item}</span></label>)}</div><div className="checklist-action"><div className="check-summary"><span>{config.dose} g de {bag?.name||'café'}</span><span>{recipe.id==='moka'?'Agua bajo la válvula':`${water} g de ${recipe.id==='espresso'?'bebida':'agua'}`}</span><span>{minutes(recipe)}</span></div><div className="checklist-buttons"><button className="icon-button" aria-label="Volver a la receta" onClick={()=>setDialog(null)}><ArrowLeft size={20}/></button><button className="primary wide" disabled={checks.filter(Boolean).length!==recipe.equipment.length||busy} onClick={start}><Play size={18}/> Iniciar preparación</button></div><p className="micro">Marca tu equipo cuando esté listo. {recipe.id==='espresso'?'Inicia la bomba al pulsar el botón.':''}</p></div></>}{dialog==='recipe'&&recipeDraft&&<RecipeEditor initial={recipeDraft} title={savedEditingId?(state.recipes||[]).find(r=>r.id===savedEditingId)?.title:undefined} busy={busy} onSave={(title,c)=>void action(async()=>{await commit(s=>{const existing=(s.recipes||[]).find(r=>r.id===savedEditingId);const saved:SavedRecipe={id:existing?.id||crypto.randomUUID(),title,config:{...structuredClone(c),bagId:null},createdAt:existing?.createdAt||Date.now()};return {...s,recipes:existing?(s.recipes||[]).map(r=>r.id===saved.id?saved:r):[...(s.recipes||[]),saved]}});setConfig(c);setDialog(null);toast.success('Receta guardada. Ya puedes prepararla.')})}/>} {dialog==='3d'&&<><div className="model-stage">{state.preferences.reduceMotion?<div className="method-static"><Coffee size={82}/><p>Vista sencilla · {recipe.name}</p></div>:<Suspense fallback={<p>Cargando modelo…</p>}><Coffee3D method={recipe.id} reduced={state.preferences.reduceMotion}/></Suspense>}</div><EquipmentGuide config={config}/><p className="micro">Modelo ilustrativo del método; no representa mediciones de tu preparación.</p></>}</>}</DialogContent>}</Dialog>
 <Dialog open={!!editingBrew} onOpenChange={open=>{if(!open)setEditingBrew(null)}}><DialogContent className="ritual-dialog"><DialogTitle>Editar tu preparación</DialogTitle><DialogDescription>La receta original se conserva. Puedes corregir dosis, tiempo y evaluación.</DialogDescription>{editingBrew&&<><div className="form-grid"><label className="field">Dosis utilizada (g)<input type="number" min={editingBrew.config.recipe.minDose} max={editingBrew.config.recipe.maxDose} step=".5" value={editingBrew.config.dose} onChange={e=>setEditingBrew({...editingBrew,config:{...editingBrew.config,dose:Number(e.target.value)}})}/></label><label className="field">Tiempo real (segundos)<input type="number" min="0" max="604800" value={editingBrew.physicalSeconds} onChange={e=>setEditingBrew({...editingBrew,physicalSeconds:Number(e.target.value)})}/></label></div><RatingForm value={editingBrew.evaluation} advanced={state.preferences.advanced} onChange={evaluation=>setEditingBrew({...editingBrew,evaluation})}/><button className="primary" disabled={busy} onClick={()=>void action(async()=>{const b=editingBrew;const issue=configError(b.config);if(issue){toast.error(issue);return}if(!Number.isFinite(b.physicalSeconds)||b.physicalSeconds<0){toast.error('Revisa el tiempo real.');return}await commit(s=>{const next={...s,brews:s.brews.map(x=>x.id===b.id?b:x)};const bag=s.bags.find(x=>x.id===b.config.bagId);if(bag&&remaining(bag,next.brews)<0)throw new Error('La bolsa no tiene suficiente café para esta corrección.');return next});setEditingBrew(null);toast.success('Preparación actualizada.')})}>Guardar cambios</button></>}</DialogContent></Dialog>
 <Dialog open={comparisonOpen} onOpenChange={setComparisonOpen}><DialogContent className="ritual-dialog comparison-dialog"><DialogTitle>¿Qué cambió entre tus tazas?</DialogTitle><DialogDescription>Compara los datos y lo que te gustó.</DialogDescription>{selectedBrews.length===2&&<BrewComparison brews={selectedBrews as [Brew,Brew]} bags={state.bags}/>}</DialogContent></Dialog>
 <AlertDialog open={!!confirm} onOpenChange={o=>{if(!o)setConfirm(null)}}><AlertDialogContent className="ritual-dialog"><AlertDialogTitle>{confirm?.title}</AlertDialogTitle><AlertDialogDescription>{confirm?.body}</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Conservar</AlertDialogCancel><AlertDialogAction onClick={()=>{const c=confirm;setConfirm(null);if(c)void action(c.action)}}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><Toaster richColors theme={state.preferences.theme} position="top-center"/></SidebarProvider>
}
