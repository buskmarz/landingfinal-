import { ChevronDown, Plus } from 'lucide-react';
import { remaining, type Bag, type Brew, type Config } from '@/lib/coffee/domain';

type Props = {
 config: Config;
 bags: Bag[];
 brews: Brew[];
 onSelect: (bagId:string|null)=>void;
 onAddBag: ()=>void;
 busy?: boolean;
};

export function BrewBagPicker({config,bags,brews,onSelect,onAddBag,busy}:Props){
 const availableBags=bags.filter(bag=>!bag.archived||bag.id===config.bagId);
 const selectedBag=availableBags.find(bag=>bag.id===config.bagId);
 const afterSaving=selectedBag?remaining(selectedBag,brews,config.dose):null;
 return <div className="recipe-coffee">
  <div className="section-top">
   {availableBags.length?<label htmlFor="recipe-coffee-bag">Café para esta receta</label>:<span>Café para esta receta</span>}
   <button className="text-button" type="button" disabled={busy} onClick={onAddBag}><Plus size={16}/> Añadir café</button>
  </div>
  {availableBags.length>0&&<div className="lab-select-field">
   <select id="recipe-coffee-bag" disabled={busy} value={config.bagId||''} onChange={e=>onSelect(e.target.value||null)}>
    <option value="">Sin bolsa asociada</option>
    {availableBags.map(b=><option key={b.id} value={b.id}>{b.name} · {remaining(b,brews)} g{b.archived?' (archivado)':''}</option>)}
   </select>
   <ChevronDown size={18} aria-hidden="true"/>
  </div>}
  {afterSaving!==null&&afterSaving>=0&&config.dose>0&&<p className="micro" role="status">Al guardar esta preparación quedarán <strong>{afterSaving} g</strong> en la bolsa.</p>}
 </div>;
}
