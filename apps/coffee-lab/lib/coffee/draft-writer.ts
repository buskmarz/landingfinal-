/** Serializes note writes; a failed draft stays available until an explicit retry. */
export type DraftStatus = 'saved' | 'saving' | 'failed';
export function createDraftWriter<T>(write:(value:T)=>Promise<unknown>,notify:(status:DraftStatus)=>void){
 let latest:T;let revision=0;let savedRevision=0;let running=false;
 const flush=async()=>{
  if(running||revision===savedRevision)return;
  running=true;notify('saving');
  try{while(savedRevision!==revision){const at=revision;const value=latest;await write(value);savedRevision=at;}notify('saved');}
  catch{notify('failed');}
  finally{running=false;}
 };
 return {set(value:T){latest=value;revision++;return flush();},retry:flush};
}
