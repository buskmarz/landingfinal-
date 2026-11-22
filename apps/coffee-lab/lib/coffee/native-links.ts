import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

const links=registerPlugin<{
 takeMethod():Promise<{method?:string}>;
 openCafeDirections():Promise<void>;
 addListener(event:'openMethod', listener:()=>void):Promise<PluginListenerHandle>;
}>('CoffeeLinks');

export function listenForNativeMethod(accept:(hash:string)=>void):()=>void {
 if(Capacitor.getPlatform()!=='ios'||!Capacitor.isPluginAvailable('CoffeeLinks'))return ()=>{};
 let disposed=false,listener:PluginListenerHandle|undefined;
 const read=async()=>{
  if(disposed)return;
  try{
   const {method}=await links.takeMethod();
   if(method&&!disposed)accept(['brew','repeat','bar'].includes(method)?'#'+method:'#method='+encodeURIComponent(method));
  }catch{/* An unavailable shortcut cannot interrupt brewing. */}
 };
 void links.addListener('openMethod',()=>void read()).then(l=>{if(disposed)void l.remove();else listener=l}).catch(()=>{});
 const onFocus=()=>void read();
 window.addEventListener('focus',onFocus);
 document.addEventListener('visibilitychange',onFocus);
 void read();
 return ()=>{disposed=true;void listener?.remove();window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus)};
}

export const hasNativeCafeDirections=()=>Capacitor.isNativePlatform()&&Capacitor.isPluginAvailable('CoffeeLinks');
export const openNativeCafeDirections=()=>links.openCafeDirections();
