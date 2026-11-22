import { confirmStep, customRecipeError, EMPTY_EVAL, saveBrew, type Active, type Config, type Store } from './domain.ts';

export type BarSlot = 0 | 1;
const setSlot = (store: Store, index: BarSlot, value: Active | null): Store => {
 const slots: [Active|null, Active|null] = [...(store.bar ?? [null,null])];
 slots[index] = value;
 return {...store,bar:slots};
};

export function startBarCup(store: Store, slot: BarSlot, config: Config, at: number, id: string): Store {
 if (store.bar?.[slot]) return store;
 if (store.activeCupping) throw new Error('Termina tu cata antes de usar la barra.');
 if (store.active?.id === id || store.bar?.some(a=>a?.id===id) || store.brews.some(b=>b.id===id)) throw new Error('Ya existe esta preparación.');
 const issue=customRecipeError(config);
 if (issue) throw new Error(issue);
 return setSlot(store,slot,{id,config:{...structuredClone(config),bagId:null},mode:'paced',events:[],status:'brewing',startedAt:at,stepStartedAt:at,stepPhysicalStartedAt:at,stepIndex:0,pausedAt:null,finishedAt:null,physicalSeconds:null,evaluation:{...EMPTY_EVAL,tags:[]}});
}

export function advanceBarCup(store: Store, slot: BarSlot, id: string, step: number, at: number): Store {
 const cup=store.bar?.[slot];
 if (!cup || cup.id !== id) return store;
 return setSlot(store,slot,confirmStep(cup,step,at));
}

export function finishBarCup(store: Store, slot: BarSlot, id: string, rating: number): Store {
 const cup=store.bar?.[slot];
 if (!cup || cup.id !== id || cup.status!=='review') return store;
 if (!Number.isInteger(rating) || rating<0 || rating>5) throw new Error('Usa una valoración de 0 a 5.');
 const next=saveBrew(store,{...cup,evaluation:{...cup.evaluation,rating}});
 return setSlot({...next,active:store.active},slot,null);
}

export function cancelBarCup(store: Store, slot: BarSlot, id: string): Store {
 return store.bar?.[slot]?.id===id ? setSlot(store,slot,null) : store;
}
