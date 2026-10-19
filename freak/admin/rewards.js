const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let validating=false,loading=false,lastCode='';
function notice(text){$('#notice').textContent=text;}
async function api(op,body){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const r=await fetch('/api/freak?op='+op,{method:body?'POST':'GET',credentials:'same-origin',signal:controller.signal,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'No disponible'),{status:r.status});return d;}
 catch(error){if(['AbortError','TypeError','SyntaxError'].includes(error.name))throw Error('No pudimos conectar. Revisa internet y actualiza antes de intentar otra vez.');throw error;}finally{clearTimeout(timer);}
}
function clearDesk(){lastCode='';$('#code').textContent='';$('#code-card').hidden=true;$('#code-person').textContent='';$('#prizes').replaceChildren();$('#validations').replaceChildren();$('#desk').hidden=true;$('#login').hidden=false;$('#validate').reset();updateTotal();}
async function load(){
 if(loading)return;loading=true;$('#refresh').disabled=true;$('#login button').disabled=true;
 try{const d=await api('admin-rewards');$('#login').hidden=true;$('#desk').hidden=false;
 $('#prizes').innerHTML=d.prizes.map(p=>`<article class="prize ${p.claimed_at?'taken':''}"><small>${p.delivered_at?'ENTREGADO':p.claimed_at?'POR ENTREGAR':'DISPONIBLE'}</small><h3>${esc(p.title)}</h3><p>${p.claimed_at?esc(p.display_name)+' · '+esc(p.phone):'Sin reservar'}</p>${p.claimed_at&&!p.delivered_at?`<button data-deliver="${esc(p.id)}">Registrar entrega</button>`:''}</article>`).join('')||'<p>No hay premios configurados.</p>';
 $('#validations').innerHTML=d.validations.map(v=>`<p><strong>${esc(v.display_name)}</strong> · ${esc(v.phone)} · ${v.normal_count+v.special_count*2} puntos validados</p>`).join('')||'<p>Todavía no hay validaciones.</p>';return true;
 }catch(error){if(error.status===401)clearDesk();notice(error.message);return false;}finally{loading=false;$('#refresh').disabled=false;$('#login button').disabled=false;}
}
$('#login').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');if(button.disabled)return;button.disabled=true;try{await api('admin-login',{key:new FormData(form).get('key')});form.reset();notice('');await load();}catch(error){notice(error.message);}finally{button.disabled=false;}};
function updateTotal(){const f=new FormData($('#validate')),normal=Number(f.get('normal')),special=Number(f.get('special')),points=normal+2*special;$('#total').textContent=points+' de 10 puntos';$('#validate-submit').disabled=validating||!Number.isInteger(normal)||!Number.isInteger(special)||normal<0||special<0||normal>5000||special>5000||points<10||f.get('marked')!=='on';}
$('#validate').oninput=updateTotal;
$('#validate').onsubmit=async event=>{
 event.preventDefault();if(validating)return;const form=event.currentTarget;validating=true;updateTotal();const f=new FormData(form);
 try{const d=await api('admin-validate-points',{name:f.get('name'),phone:f.get('phone'),normal:Number(f.get('normal')),special:Number(f.get('special')),marked:f.get('marked')==='on'});lastCode=d.code;$('#code-person').textContent='Código para '+f.get('name')+' · '+f.get('phone');$('#code').textContent=d.code;$('#code-card').hidden=false;$('#copy-code').textContent='Copiar código';form.reset();notice(d.points+' puntos validados. Entrega el código a esta persona.');await load();$('#code-card').scrollIntoView({block:'center'});
 }catch(error){notice(error.message);if(error.status===401)clearDesk();}finally{validating=false;updateTotal();}
};
$('#copy-code').onclick=async()=>{if(!lastCode)return;try{await navigator.clipboard.writeText(lastCode);$('#copy-code').textContent='Código copiado';}catch{notice('No pudimos copiarlo. Selecciona el código y cópialo manualmente.');}};
$('#prizes').onclick=async event=>{const button=event.target.closest('[data-deliver]');if(!button||button.disabled)return;if(!confirm('¿Entregaste este premio a la persona indicada?'))return;button.disabled=true;try{await api('admin-deliver-reward',{id:button.dataset.deliver});notice('Entrega registrada.');await load();}catch(error){notice(error.message);if(error.status===401)clearDesk();}finally{if(button.isConnected)button.disabled=false;}};
$('#refresh').onclick=async()=>{notice('');await load();};
$('#logout').onclick=async()=>{const button=$('#logout');button.disabled=true;try{await api('admin-logout',{});clearDesk();notice('Sesión cerrada.');}catch(error){notice(error.message);}finally{button.disabled=false;}};
load();
