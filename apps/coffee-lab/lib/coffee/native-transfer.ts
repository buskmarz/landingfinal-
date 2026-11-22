import { Capacitor, registerPlugin } from '@capacitor/core';
import { downloadJson } from './transfer';

const bridge = registerPlugin<{
 shareJson(options:{text:string;name:string}):Promise<{shared:boolean}>;
 pickJson():Promise<{text?:string;cancelled?:boolean}>;
}>('CoffeeFiles');

export const hasNativeFiles = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('CoffeeFiles');

export async function exportJson(value:unknown,name:string):Promise<boolean> {
 if(hasNativeFiles())return (await bridge.shareJson({text:JSON.stringify(value,null,2),name})).shared;
 downloadJson(value,name);
 return true;
}

export async function pickNativeJson():Promise<string|null> {
 const result=await bridge.pickJson();
 return result.cancelled?null:result.text??null;
}
