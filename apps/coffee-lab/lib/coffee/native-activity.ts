import { Capacitor, registerPlugin } from '@capacitor/core';
import { pourPlan, targets, type Active } from './domain';

function describeBrew(active:Active|null,barCup?:'A'|'B'){
 if(active?.status!=='brewing')return null;
 const step=active.config.recipe.steps[active.stepIndex];
 if(!step)return null;
 const nextAction=active.config.recipe.steps[active.stepIndex+1]?.title;
 const target=targets(active.config)[active.stepIndex];
 const action=pourPlan(active).canChoose?'Revisa el vertido en Coffee Lab':target&&target.add>0?`Añade ${target.add} g · meta ${target.total} g`:step.title;
 return {
  id:active.id,method:active.config.recipe.id,
  startedAt:active.startedAt,step:active.stepIndex+1,total:active.config.recipe.steps.length,
  paused:active.pausedAt!==null,
  action,
  ...(barCup?{barCup}:{}),
  ...(nextAction?{nextAction}:{}),
  ...(active.mode!=='paced'&&!step.manual&&active.pausedAt===null?{staleAt:active.stepStartedAt+step.seconds*1000}:{}),
 };
}

const activity=registerPlugin<{
 update(options:{sessions:NonNullable<ReturnType<typeof describeBrew>>[]}):Promise<void>;
}>('CoffeeActivity');

export function syncNativeBrews(active:Active|null,bar?:[Active|null,Active|null]):void {
 if(Capacitor.getPlatform()!=='ios'||!Capacitor.isPluginAvailable('CoffeeActivity'))return;
 const sessions=[describeBrew(active),describeBrew(bar?.[0]??null,'A'),describeBrew(bar?.[1]??null,'B')].filter(session=>session!==null);
 void activity.update({sessions}).catch(()=>{});
}
