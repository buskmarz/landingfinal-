import { hasCloudAccount, cloudRequest } from './cloud-account';
import { hasNativeAccount, nativeAccount } from './native-account';

export class AccountConnectionError extends Error {}
export async function accountRequest(path:string,body?:unknown,owner?:string){
 if(hasCloudAccount())return cloudRequest(path,body,owner);
 if(hasNativeAccount()){
  try{return await nativeAccount.request({path,owner,body})}
  catch(error){
   if(error instanceof Error&&'code' in error&&error.code==='CONNECTION')throw new AccountConnectionError(error.message);
   throw error;
  }
 }
 const headers=new Headers();
 if(body)headers.set('Content-Type','application/json');
 if(owner)headers.set('X-Coffee-Account',owner);
 const controller=path==='recipe-library'?new AbortController():undefined;
 const timeout=controller?setTimeout(()=>controller.abort(),15000):undefined;
 try{
 const response=await fetch('/coffee-lab/api/'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store',signal:controller?.signal})
  .catch(()=>{throw new AccountConnectionError('Se perdió la conexión. Intenta de nuevo.')});
 if((path==='recipes'||path==='recipe-library')&&response.status>=500)throw new AccountConnectionError('El servidor de recetas no respondió.');
 if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Cuentas aún no conectadas en esta vista.');
 const value=await response.json().catch(error=>{
  if(error instanceof TypeError||error?.name==='AbortError'){
   throw new AccountConnectionError('La respuesta se interrumpió. Intenta de nuevo.');
  }
  throw error;
 });
 if(!response.ok){
  if(path==='auth/delete-user'&&value.code==='SESSION_EXPIRED')throw new Error('Vuelve a iniciar sesión y confirma otra vez.');
  throw Object.assign(new Error(value.error||value.message||'No se pudo conectar.'), {code:value.code});
 }
 return value;
 }finally{clearTimeout(timeout)}
}
