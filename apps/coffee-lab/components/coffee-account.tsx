import { useEffect, useRef, useState } from 'react';
import { createAuthClient } from 'better-auth/react';
import { Cloud, RefreshCw, UserRound } from 'lucide-react';
import type { SavedRecipe, Store } from '../lib/coffee/domain';
import { planRecipeSync } from '../lib/coffee/recipe-sync';
import { repository } from '../lib/coffee/storage';
import { recipeFile } from '../lib/coffee/transfer';
import { accountRequest as api, AccountConnectionError } from '../lib/coffee/account-transport';
import { parseRecipeLibrary, type RecipeLibrary } from '../lib/coffee/recipe-library';
import { enrollRecipes, planLibrarySync } from '../lib/coffee/recipe-library-merge';
import type { LibrarySyncStatus } from '../hooks/use-recipe-library';
import { accountCallback, deviceConnectionCode } from '../lib/coffee/account-device';
import { hasCloudAccount, cloudLogin, cloudStatus } from '../lib/coffee/cloud-account';
import { hasNativeAccount, nativeAccount, type CoffeeAccountUser } from '../lib/coffee/native-account';
const client=createAuthClient({baseURL:typeof location==='undefined'||!location.protocol.startsWith('http')?'http://127.0.0.1:5198':location.origin,basePath:'/coffee-lab/api/auth'});
const ACCOUNT_UNAVAILABLE='Tus recetas siguen guardadas aquí. No se pudo conectar con tu cuenta.';
export default function CoffeeAccount({state,onRefresh,libraryStatus,retryLibrary}:{
 state:Store;onRefresh:(state:Store)=>void;libraryStatus:LibrarySyncStatus;retryLibrary:()=>void;
}){
 const [providers,setProviders]=useState<string[]>([]),[ready,setReady]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false);
 const [user,setUser]=useState<CoffeeAccountUser|null>(null);
 const [preview,setPreview]=useState<null|{owner:string;recipes:SavedRecipe[];incoming:number}>(null);
 const [copyPending,setCopyPending]=useState(false);
 const [libraryReview,setLibraryReview]=useState<{owner:string;local:SavedRecipe[];remote:RecipeLibrary}|null>(null);
 const [selectedRecipes,setSelectedRecipes]=useState<string[]>([]);
 const [deletionOwner,setDeletionOwner]=useState<string|null>(null);
 const deletionTitle=useRef<HTMLElement>(null);
 const deletionButton=useRef<HTMLButtonElement>(null);
 const running=useRef(false);
 const native=hasNativeAccount();
 const cloud=hasCloudAccount();
 const [nativeConfigured,setNativeConfigured]=useState(false);
 const [localAccount,setLocalAccount]=useState(false);
 const [nativeApple,setNativeApple]=useState(false);
 const [nativeCode,setNativeCode]=useState('');
 const [approveOnMac,setApproveOnMac]=useState(false);
 const [enteredCode,setEnteredCode]=useState('');
 const [accountCheck,setAccountCheck]=useState(0);
 const deviceCode=deviceConnectionCode(location.search);
 const [deviceReviewed,setDeviceReviewed]=useState(false);
 const [deviceMatches,setDeviceMatches]=useState(false);
 const [deviceFinished,setDeviceFinished]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  let attempt=0;
  const load=async()=>{
   const current=++attempt;
   try{
    const account=cloud?await cloudStatus():native?await nativeAccount.status():await readBrowserAccount();
    if(cancelled||current!==attempt||running.current)return;
    setNativeConfigured(account.configured);
    setLocalAccount(account.local===true);
    setNativeApple('nativeApple' in account && account.nativeApple===true);
    setProviders(account.providers);
    setUser(account.user||null);
    setReady(true);
    setMessage(previous=>previous===ACCOUNT_UNAVAILABLE?'':previous);
   }catch{if(!cancelled&&current===attempt&&!running.current)setMessage(ACCOUNT_UNAVAILABLE);}
  };
  void load();
  window.addEventListener('online',load);
  return()=>{cancelled=true;window.removeEventListener('online',load)};
 },[cloud,native,accountCheck]);
 useEffect(()=>{if(deletionOwner)deletionTitle.current?.focus()},[deletionOwner]);
 async function run(fn:()=>Promise<void>){
  if(running.current)return;
  running.current=true;
  setBusy(true);
  setMessage('');
  try{await fn()}
  catch(error){setMessage(error instanceof Error?error.message:'No se pudo completar.')}
  finally{running.current=false;setBusy(false)}
 }
 async function login(provider:'google'|'apple'){await run(async()=>{
  if(cloud){const connected=await cloudLogin(provider);if(connected)setUser(connected);return;}
  const result=await client.signIn.social({provider,callbackURL:accountCallback(location.origin,deviceCode)});if(result.error)throw new Error('No se pudo iniciar sesión. Intenta de nuevo.');});}
 async function signOut(){
  await run(async()=>{
   if(native||cloud)await api('auth/sign-out',{},user?.id);
   else{
    const result=await client.signOut();
    if(result.error)throw new Error('No se pudo cerrar la sesión.');
   }
   setUser(null);
   setPreview(null);
   setLibraryReview(null);
   setConsent(false);
   setDeletionOwner(null);
   setMessage('Sesión cerrada. Las recetas permanecen en este dispositivo.');
  });
 }
 async function reviewDevice(){
  setDeviceReviewed(false);
  setDeviceMatches(false);
  await run(async()=>{
   if(!user||!deviceCode)throw new Error('Inicia sesión para revisar el código.');
   const request=await api('auth/device?user_code='+encodeURIComponent(deviceCode),undefined,user.id);
   if(request.client_id!=='coffee-lab-ios-preview')throw new Error('Este código no corresponde a Coffee Lab para iPhone.');
   setDeviceReviewed(true);
  });
 }
 async function confirmDevice(allow:boolean){
  if(!user||!deviceCode||!deviceReviewed||(allow&&!deviceMatches))return;
  await run(async()=>{
   await api('auth/device/'+(allow?'approve':'deny'),{userCode:deviceCode},user.id);
   setDeviceFinished(true);
   setMessage(allow?'iPhone autorizado. Vuelve a Coffee Lab para continuar.':'Conexión rechazada.');
   history.replaceState(null,'',location.pathname+location.hash);
  });
 }
 async function inspect(){
  setLibraryReview(null);
  setPreview(null);
  setConsent(false);
  setCopyPending(false);
  await run(async()=>{
   if(!user)throw new Error('Inicia sesión.');
   const snapshot=await repository.read();
   const remote=await api('recipes',undefined,user.id);
   if(!Array.isArray(remote.recipes))throw new Error('Copia inválida.');
   await planRecipeSync(snapshot,remote.recipes);
   setPreview({owner:user.id,recipes:snapshot.recipes||[],incoming:remote.recipes.length});
  });
 }
 async function reviewLibrary(){
  setPreview(null);
  await run(async()=>{
   if(!user)throw new Error('Inicia sesión.');
   const snapshot=await repository.read();
   const profile=snapshot.recipeLibrarySync;
   if(profile&&profile.owner!==user.id)throw new Error('Desactiva primero la sincronización anterior en este dispositivo.');
   const linked=new Set(profile?.links.map(link=>link.localId));
   const local=(snapshot.recipes||[]).filter(recipe=>!linked.has(recipe.id));
   const remote=parseRecipeLibrary(await api('recipe-library',undefined,user.id));
   setSelectedRecipes([]);
   setLibraryReview({owner:user.id,local,remote});
  });
 }
 async function enableLibrary(){
  if(!libraryReview||libraryReview.owner!==user?.id)return;
  const approved=libraryReview;
  await run(async()=>{
   const snapshot=await repository.read();
   const previous=snapshot.recipeLibrarySync;
   if(previous?.pending||previous&&previous.owner!==approved.owner)throw new Error('Revisa de nuevo la cuenta y sus cambios pendientes.');
   const selected=approved.local.filter(recipe=>selectedRecipes.includes(recipe.id));
   const profile=await enrollRecipes(previous||{owner:approved.owner,links:[]},selected,approved.remote);
   await planLibrarySync(snapshot.recipes||[],profile,approved.remote);
   const enabled=await repository.update(current=>{
    if(JSON.stringify(current.recipeLibrarySync)!==JSON.stringify(previous)||
       selected.some(recipe=>!current.recipes?.some(value=>value.id===recipe.id&&JSON.stringify(value)===JSON.stringify(recipe)))){
     throw new Error('Las recetas cambiaron. Revisa la selección de nuevo.');
    }
    return {...current,recipeLibrarySync:profile};
   });
   onRefresh(enabled);
   setLibraryReview(null);
   retryLibrary();
  });
 }
 async function disableLibrary(){
  await run(async()=>{
   const result=await repository.update(current=>{
    const {recipeLibrarySync: _sync,...local}=current;
    return local;
   });
   setLibraryReview(null);
   onRefresh(result);
   setMessage('Sincronización desactivada en este dispositivo.');
  });
 }
 async function sync(){
  if(!preview||!consent||busy)return;
  const approved=preview;
  await run(async()=>{
   try{
    const snapshot=await repository.read();
    const expected=JSON.stringify(approved.recipes);
    const changed='Cambiaste una receta. Revisa otra vez la copia.';
    if(JSON.stringify(snapshot.recipes||[])!==expected)throw new Error(changed);
    const recipes=approved.recipes.map(recipe=>recipeFile(recipe).data);
    const response=await api('recipes',{recipes},approved.owner);
    if(!Array.isArray(response.recipes))throw new Error('Copia inválida.');
    const plan=await planRecipeSync(snapshot,response.recipes);
    const result=await repository.update(current=>{
     if(JSON.stringify(current.recipes||[])!==expected)throw new Error(changed);
     return {...current,recipes:plan.recipes};
    });
    onRefresh(result);
    setMessage(`Copia completada: ${plan.added} recetas añadidas${plan.conflicts?`, ${plan.conflicts} versiones conservadas`:''}.`);
   }catch(error){
    if(error instanceof AccountConnectionError){
     setCopyPending(true);
     throw new Error('Copia pendiente. Reintenta cuando vuelva la conexión.');
    }
    setPreview(null);
    setConsent(false);
    setCopyPending(false);
    throw error;
   }
   setPreview(null);
   setConsent(false);
   setCopyPending(false);
  });
 }
 async function deleteAccount(){
  if(!deletionOwner||busy)return;
  await run(async()=>{
   const result=await api('auth/delete-user',{},deletionOwner);
   if(result.success!==true||result.message!=='User deleted')throw new Error('La eliminación aún no se ha confirmado.');
   setUser(null);
   setPreview(null);
   setLibraryReview(null);
   setConsent(false);
   setDeletionOwner(null);
   onRefresh(await repository.update(current=>{
    if(current.recipeLibrarySync?.owner!==deletionOwner)return current;
    const {recipeLibrarySync: _sync,...local}=current;
    return local;
   }));
   setMessage('Cuenta y copia eliminadas. Tus recetas siguen en este dispositivo.');
  });
 }
 return <section className="coffee-account" aria-labelledby="account-title"><div className="section-top"><h3 id="account-title"><UserRound size={18}/> Mi cuenta</h3>{localAccount&&<span className="micro">Prueba local</span>}</div>
 {deviceCode&&!deviceFinished&&<div className="notice" role="group" aria-labelledby="connect-coffee-device">
  <strong id="connect-coffee-device">Conectar mi iPhone</strong>
  <p>Código <b className="device-code">{deviceCode.slice(0,4)} {deviceCode.slice(4)}</b></p>
  {!user?<p>Inicia sesión para revisar la conexión.</p>:<>
   <p>Usarás la cuenta {user.email}.</p>
   {!deviceReviewed?<button className="subtle" disabled={busy} onClick={()=>void reviewDevice()}>Revisar conexión</button>:<>
    <p>Permite acceder a tu cuenta desde Coffee Lab para iPhone.</p>
    <label><input type="checkbox" checked={deviceMatches} disabled={busy} onChange={event=>setDeviceMatches(event.target.checked)}/> El código coincide con el de mi iPhone.</label>
    <p className="micro">Aprueba solo una conexión que tú hayas iniciado.</p>
    <button className="primary" disabled={busy||!deviceMatches} onClick={()=>void confirmDevice(true)}>Conectar mi iPhone</button>
    <button className="text-button" disabled={busy} onClick={()=>void confirmDevice(false)}>Rechazar conexión</button>
   </>}
  </>}
 </div>}
 {!user?<><p className="muted">Tus recetas, contigo. Preparar sin cuenta sigue siendo gratis.</p>
 {nativeApple&&!nativeCode&&<button className="subtle" disabled={busy} onClick={()=>void run(async()=>{
  setUser((await nativeAccount.signInWithApple()).user);
  setMessage('iPhone conectado.');
 })}>Continuar con Apple</button>}
 {native&&!cloud?nativeCode?<div className="notice">
  <strong>Código {nativeCode.slice(0,4)} {nativeCode.slice(4)}</strong>
  <p>{approveOnMac?'En la Mac, abre Preferencias → Vincular iPhone e ingresa este código.':'Comprueba este código al iniciar sesión.'}</p>
  <button className="primary" disabled={busy} onClick={()=>void run(async()=>{
   try{setUser((await nativeAccount.connect()).user);setMessage('iPhone conectado.');}
   finally{setNativeCode('');}
  })}>{approveOnMac?'Esperar autorización':'Abrir acceso seguro'}</button>
  <button className="text-button" disabled={busy&&!approveOnMac} onClick={()=>{
   if(approveOnMac)void nativeAccount.cancelConnection();
   setNativeCode('');
  }}>Cancelar</button>
 </div>:(!nativeApple||providers.length>0)&&<button className="subtle" disabled={busy||!nativeConfigured||!providers.length} onClick={()=>void run(async()=>{
  const request=await nativeAccount.prepare();
  setApproveOnMac(request.approveOnMac===true);
  setNativeCode(request.code);
 })}>{!localAccount&&providers.includes('google')?'Continuar con Google':'Conectar mi cuenta'}</button>:<div className="account-providers"><button className="subtle" disabled={busy||!providers.includes('google')} onClick={()=>void login('google')}>Continuar con Google</button><button className="subtle" disabled={busy||!providers.includes('apple')} onClick={()=>void login('apple')}>Continuar con Apple</button></div>}
 {ready&&!providers.length&&!nativeApple&&<p className="micro">{native&&!nativeConfigured?'Falta conectar el servidor de cuentas para iPhone.':'Falta registrar Coffee Lab en Google y Apple.'} Tus recetas siguen en este dispositivo.</p>}</>:<><p>{user.name}<br/><small>{user.email}</small></p>{!cloud&&<button className="subtle" disabled={busy||!!deletionOwner} onClick={()=>void inspect()}><Cloud size={16}/> Revisar copia de recetas</button>}<button className="text-button" disabled={busy} onClick={()=>void signOut()}>Cerrar sesión</button>
 {!deletionOwner&&<button ref={deletionButton} className="text-button danger" disabled={busy} onClick={()=>{
  setPreview(null);
  setLibraryReview(null);
  setConsent(false);
  setMessage('');
  setDeletionOwner(user.id);
 }}>Eliminar cuenta y copia</button>}
 </>}
 {!cloud&&!native&&location.hostname==='127.0.0.1'&&user&&!deviceCode&&!deletionOwner&&<details className="compact-disclosure">
  <summary>Vincular iPhone</summary>
  <form onSubmit={event=>{
   event.preventDefault();
   if(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(enteredCode))location.assign(accountCallback(location.origin,enteredCode));
  }}>
   <label>Código del iPhone <input autoComplete="off" autoCapitalize="characters" spellCheck={false} value={enteredCode}
    onChange={event=>setEnteredCode(event.target.value.toUpperCase().replace(/\s/g,'').slice(0,8))}/></label>
   <button className="subtle" disabled={busy||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(enteredCode)}>Revisar código</button>
  </form>
 </details>}
 {!deviceCode&&!deletionOwner&&(user||state.recipeLibrarySync)&&<div className="notice">
  <strong>Sincronizar recetas</strong>
  {ready&&state.recipeLibrarySync&&state.recipeLibrarySync.owner!==user?.id
   ? <p className="micro">Inicia sesión en la cuenta vinculada para continuar.</p>
   : <p role="status" className="micro">{libraryStatus.label}{libraryStatus.detail&&<> · {libraryStatus.detail}</>}</p>}
  {user&&(!state.recipeLibrarySync||state.recipeLibrarySync.owner===user.id)&&!libraryReview&&<>
   <button className="subtle" disabled={busy||libraryStatus.busy} onClick={()=>void reviewLibrary()}>
    {state.recipeLibrarySync?'Vincular más recetas':'Configurar sincronización'}
   </button>
   {state.recipeLibrarySync&&<button className="text-button" disabled={busy||libraryStatus.busy} onClick={retryLibrary}>Sincronizar ahora</button>}
  </>}
  {libraryReview&&<div role="group" aria-label="Confirmar sincronización">
   <p>{user?.email} · {libraryReview.remote.recipes.length} en la cuenta</p>
   {libraryReview.local.length>0&&<label>
    <input type="checkbox" checked={selectedRecipes.length===libraryReview.local.length} disabled={busy}
     onChange={event=>setSelectedRecipes(event.target.checked?libraryReview.local.map(recipe=>recipe.id):[])}/>
    Vincular {libraryReview.local.length} {libraryReview.local.length===1?'receta de este dispositivo':'recetas de este dispositivo'}
   </label>}
   {libraryReview.local.length>1&&<details className="compact-disclosure">
    <summary>Elegir recetas · {selectedRecipes.length}</summary>
    <div className="account-recipe-choices">
     {libraryReview.local.map(recipe=><label key={recipe.id}>
      <input type="checkbox" checked={selectedRecipes.includes(recipe.id)} disabled={busy}
       onChange={event=>setSelectedRecipes(ids=>event.target.checked?[...ids,recipe.id]:ids.filter(id=>id!==recipe.id))}/>
      {recipe.title}
     </label>)}
    </div>
   </details>}
   <p className="micro">Las recetas vinculadas se actualizan y se eliminan en tus dispositivos. Las demás quedan aquí.</p>
   <button className="primary" disabled={busy||libraryStatus.busy||!!state.recipeLibrarySync&&!selectedRecipes.length} onClick={()=>void enableLibrary()}>
    {state.recipeLibrarySync?'Vincular recetas':'Activar sincronización'}
   </button>
   <button className="text-button" disabled={busy} onClick={()=>setLibraryReview(null)}>Cancelar</button>
  </div>}
  {state.recipeLibrarySync&&<button className="text-button" disabled={busy||libraryStatus.busy} onClick={()=>void disableLibrary()}>Desactivar en este dispositivo</button>}
 </div>}
 {user&&deletionOwner&&<div className="notice" role="group" aria-labelledby="delete-coffee-account">
  <strong id="delete-coffee-account" ref={deletionTitle} tabIndex={-1}>Eliminar la cuenta de {user.email}</strong>
  <p>Se elimina la copia de tu cuenta. Las recetas guardadas aquí se conservan.</p>
  <p>Si usaste Apple, puedes revisar el acceso en Ajustes → tu nombre → Iniciar sesión con Apple.</p>
  <button className="subtle" disabled={busy} onClick={()=>{
   setDeletionOwner(null);
   requestAnimationFrame(()=>deletionButton.current?.focus());
  }}>Conservar mi cuenta</button>
  <button className="text-button danger" disabled={busy} onClick={()=>void deleteAccount()}>Confirmar eliminación</button>
 </div>}
 {preview&&<div className="notice"><strong>{preview.recipes.length} aquí · {preview.incoming} versiones en tu cuenta</strong><p>Se conservan ambas versiones si son distintas. No se copian fotos, historial ni bolsas. Las recetas eliminadas solo aquí pueden volver desde la copia.</p><label><input type="checkbox" disabled={busy} checked={consent} onChange={e=>setConsent(e.target.checked)}/> Copiar estas recetas a la cuenta mostrada y descargar las suyas.</label><button className="primary" disabled={busy||!consent} onClick={()=>void sync()}><RefreshCw size={16}/> {copyPending?'Reintentar copia':'Guardar y recuperar'}</button><button className="text-button" disabled={busy} onClick={()=>{setPreview(null);setConsent(false);setCopyPending(false)}}>Cancelar</button></div>}
 <p role="status" className="micro">{busy?'Conectando…':message}</p>
 {message===ACCOUNT_UNAVAILABLE&&<button className="subtle" disabled={busy} onClick={()=>{
  setMessage('');
  setAccountCheck(count=>count+1);
 }}>Reintentar conexión</button>}
 </section>;
}

async function readBrowserAccount(){
 const caps=await api('capabilities');
 const session=await client.getSession();
 return {configured:true,local:caps.local===true,providers:caps.providers,user:session.data?.user};
}
