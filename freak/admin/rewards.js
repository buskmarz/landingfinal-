const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let validating=false,loading=false,reissuing=false,lastCode='';
function notice(text){$('#notice').textContent=text;}
const phoneLabel=value=>String(value??'').replace(/^\+52(?=\d{10}$)/,'');
async function api(op,body){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const r=await fetch('/api/freak?op='+op,{method:body?'POST':'GET',credentials:'same-origin',signal:controller.signal,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'No disponible'),{status:r.status});return d;}
 catch(error){if(['AbortError','TypeError','SyntaxError'].includes(error.name))throw Error('No pudimos conectar. Revisa internet y actualiza antes de intentar otra vez.');throw error;}finally{clearTimeout(timer);}
}
function clearDesk(){lastCode='';$('#code').textContent='';$('#code-card').hidden=true;$('#code-person').textContent='';$('#prizes').replaceChildren();$('#validations').replaceChildren();$('#desk').hidden=true;$('#login').hidden=false;$('#validate').reset();updateTotal();}
async function load(){
 if(loading)return;loading=true;$('#refresh').disabled=true;$('#login button').disabled=true;
 try{const d=await api('admin-rewards');$('#login').hidden=true;$('#desk').hidden=false;
 $('#prizes').innerHTML=d.prizes.map(p=>`<article class="prize ${p.claimed_at?'taken':''}"><small>${p.delivered_at?'ENTREGADO':p.claimed_at?'POR ENTREGAR':'DISPONIBLE'}</small><h3>${esc(p.title)}</h3><p>${p.claimed_at?esc(p.display_name)+' · '+esc(phoneLabel(p.phone)):'Sin reservar'}</p>${p.claimed_at&&!p.delivered_at?`<button data-deliver="${esc(p.id)}">Registrar entrega</button>`:''}</article>`).join('')||'<p>No hay premios configurados.</p>';
 const totals=d.analytics?.totals||{};const metrics=[['Aperturas QR premio',totals.opens],['Sesiones por QR',totals.sessions],['QR guardados',totals.saved],['Intentos con cuenta',totals.attempts],['Intentos QR ocupado',totals.occupied],['10 puntos',totals.validated],['Confirmados',totals.claimed],['Entregados',totals.delivered]];
 $('#analytics').innerHTML='<div class="analytics-grid">'+metrics.map(([label,value])=>`<div><strong>${esc(value||0)}</strong><small>${label}</small></div>`).join('')+'</div>'+`<p class="fine-print">Guardados / sesiones: ${totals.sessions?Math.round(totals.saved/totals.sessions*100)+'%':'Sin datos'} · Canjes / QR guardados: ${totals.saved?Math.round(totals.claimed/totals.saved*100)+'%':'Sin datos'}</p>`;
 $('#analytics-dates').innerHTML='<p>Hora de Puebla. Aperturas desde esta actualización.</p><table class="analytics-table"><thead><tr><th>Fecha</th><th>QR</th><th>Aperturas</th><th>Sesiones del día</th></tr></thead><tbody>'+(d.analytics?.daily||[]).map(v=>`<tr><td>${esc(v.day)}</td><td>${esc(v.poster_id)}</td><td>${v.opens}</td><td>${v.sessions}</td></tr>`).join('')+'</tbody></table><h3>Por hora</h3><table class="analytics-table"><tbody>'+(d.analytics?.hourly||[]).map(v=>`<tr><td>${v.hour}:00</td><td>${v.opens} aperturas</td></tr>`).join('')+'</tbody></table>';
 $('#posters').innerHTML=(d.posters||[]).map(p=>`<article class="poster-admin"><h3>QR ${esc(p.id)}</h3><p>${p.opens} aperturas · ${p.scans} sesiones · ${p.occupied_attempts} intentos con QR ocupado · ${p.saved_at?'Guardado · '+esc(stamp(p.saved_at)):'Disponible'}</p>${p.saved_at?`<p>${esc(p.display_name)} · ${esc(phoneLabel(p.phone))}</p>`:''}<form data-location="${esc(p.id)}"><label>Ubicación / coordenadas<input name="location" maxlength="240" value="${esc(p.location)}" placeholder="Ej. poste frente a… o latitud, longitud"></label><button class="secondary">Guardar ubicación</button></form></article>`).join('');
 $('#reservations').innerHTML=(d.reservations||[]).map(r=>`<p><strong>QR ${esc(r.poster_id)}</strong> · ${esc(r.display_name)} · ${esc(phoneLabel(r.phone))} · ${esc(stamp(r.created_at))}</p>`).join('')||'<p>Ningún QR guardado.</p>';
 $('#validations').innerHTML=d.validations.map(v=>`<article class="validation-row"><p><strong>${esc(v.display_name)}</strong> · ${esc(phoneLabel(v.phone))} · ${v.normal_count+v.special_count*2} puntos validados</p>${v.has_prize?'<small>Premio confirmado</small>':`<button class="secondary" data-reissue-phone="${esc(phoneLabel(v.phone))}" data-reissue-name="${esc(v.display_name)}">Reemitir código</button><div data-reissue-options hidden><p>El código anterior dejará de funcionar.</p><button data-reissue-confirm>Confirmar reemisión</button><button class="secondary" data-reissue-cancel>Cancelar</button></div>`}</article>`).join('')||'<p>Todavía no hay validaciones.</p>';await loadHistory(true);await loadTicket(true);return true;
 }catch(error){if(error.status===401)clearDesk();notice(error.message);return false;}finally{loading=false;$('#refresh').disabled=false;$('#login button').disabled=false;}
}
$('#login').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');if(button.disabled)return;button.disabled=true;try{await api('admin-login',{key:new FormData(form).get('key')});form.reset();notice('');await load();}catch(error){notice(error.message);}finally{button.disabled=false;}};
function updateTotal(){const f=new FormData($('#validate')),normal=Number(f.get('normal')),special=Number(f.get('special')),points=normal+2*special;$('#total').textContent=points+' de 10 puntos';$('#validate-submit').disabled=validating||reissuing||!Number.isInteger(normal)||!Number.isInteger(special)||normal<0||special<0||normal>5000||special>5000||points<10||f.get('marked')!=='on';}
$('#validate').oninput=updateTotal;
$('#validate').onsubmit=async event=>{
 event.preventDefault();if(validating||reissuing)return;const form=event.currentTarget;validating=true;updateTotal();const f=new FormData(form);
 try{const d=await api('admin-validate-points',{name:f.get('name'),phone:f.get('phone'),normal:Number(f.get('normal')),special:Number(f.get('special')),marked:f.get('marked')==='on'});lastCode=d.code;$('#code-person').textContent='Código para '+f.get('name')+' · '+f.get('phone');$('#code').textContent=d.code;$('#code-card').hidden=true;form.reset();notice(d.points+' puntos comprobados. Ya puede elegir su premio desde su cuenta.');await load();
 }catch(error){notice(error.message);if(error.status===401)clearDesk();}finally{validating=false;updateTotal();}
};
$('#copy-code').onclick=async()=>{if(!lastCode)return;try{await navigator.clipboard.writeText(lastCode);$('#copy-code').textContent='Código copiado';}catch{notice('No pudimos copiarlo. Selecciona el código y cópialo manualmente.');}};
$('#prizes').onclick=async event=>{const button=event.target.closest('[data-deliver]');if(!button||button.disabled)return;if(!confirm('¿Entregaste este premio a la persona indicada?'))return;button.disabled=true;try{await api('admin-deliver-reward',{id:button.dataset.deliver});notice('Entrega registrada.');await load();}catch(error){notice(error.message);if(error.status===401)clearDesk();}finally{if(button.isConnected)button.disabled=false;}};
$('#validations').onclick=async event=>{
 const row=event.target.closest('.validation-row');if(!row||reissuing||validating)return;
 const start=row.querySelector('[data-reissue-phone]'),options=row.querySelector('[data-reissue-options]');
 if(event.target.closest('[data-reissue-phone]')){options.hidden=false;start.hidden=true;row.querySelector('[data-reissue-confirm]').focus();return;}
 if(event.target.closest('[data-reissue-cancel]')){options.hidden=true;start.hidden=false;start.focus();return;}
 if(!event.target.closest('[data-reissue-confirm]'))return;
 reissuing=true;updateTotal();row.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{const d=await api('admin-reissue-code',{name:start.dataset.reissueName,phone:start.dataset.reissuePhone,confirmed:true});lastCode=d.code;$('#code-person').textContent='Código nuevo para '+start.dataset.reissueName+' · '+start.dataset.reissuePhone;$('#code').textContent=d.code;$('#code-card').hidden=false;$('#copy-code').textContent='Copiar código';notice('Código reemitido. El anterior ya no funciona. Entrega el nuevo.');await load();$('#code-card').scrollIntoView({block:'center'});
 }catch(error){notice(error.message);if(error.status===401)clearDesk();}finally{reissuing=false;updateTotal();if(row.isConnected)row.querySelectorAll('button').forEach(b=>b.disabled=false);}
};
$('#refresh').onclick=async()=>{notice('');await load();};
$('#logout').onclick=async()=>{const button=$('#logout');button.disabled=true;try{await api('admin-logout',{});clearDesk();notice('Sesión cerrada.');}catch(error){notice(error.message);}finally{button.disabled=false;}};
load();

$('#posters').onsubmit=async event=>{const form=event.target.closest('[data-location]');if(!form)return;event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await api('admin-poster-location',{id:form.dataset.location,location:new FormData(form).get('location')});notice('Ubicación guardada.');}catch(error){notice(error.message);}finally{button.disabled=false;}};

const sourceLabel=value=>({boleto:'Boleto',anuncio:'Anuncio',general:'General'}[value]||value);
const stamp=value=>new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',dateStyle:'short',timeStyle:'medium',hour12:false}).format(new Date(value));
function filterQuery(selector,defaults={}){
 const form=$(selector),query=new URLSearchParams(defaults);
 if(form)for(const [key,value]of new FormData(form))if(value)query.set(key,value);
 return query;
}
function downloadCsv(name,head,rows){
 const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'").replaceAll('"','""')+'"';
 const csv='\ufeff'+[head,...rows].map(r=>r.map(cell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function collectAnalytics(op,query,cursorField='next'){
 const params=new URLSearchParams(query);params.delete('cursor');params.delete('snapshot');
 const rows=[];let cursor=null,snapshot=null;
 do{
  if(cursor)params.set('cursor',cursor);if(snapshot)params.set('snapshot',snapshot);
  const d=await api(op+'&'+params);rows.push(...d.events);snapshot=d.snapshot;cursor=d[cursorField];
 }while(cursor);
 return rows;
}
let historyRows=[],historyNext=null,historyBusy=false,historySnapshot=null,historyQuery=new URLSearchParams();
async function loadHistory(reset=false){
 if(historyBusy)return;historyBusy=true;
 try{
 if(reset){historyQuery=filterQuery('#history-filter');historySnapshot=null;}
 const query=new URLSearchParams(historyQuery);if(!reset&&historyNext)query.set('cursor',historyNext);if(historySnapshot)query.set('snapshot',historySnapshot);
 const d=await api('admin-scan-history&'+query);historyRows=reset?d.events:[...historyRows,...d.events];historyNext=d.nextCursor;historySnapshot=d.snapshot;
 $('#scan-history').innerHTML='<table class="analytics-table"><thead><tr><th>Hora · Puebla</th><th>QR</th><th>Al abrir</th><th>Ubicación</th></tr></thead><tbody>'+historyRows.map(e=>`<tr><td>${esc(stamp(e.created_at))}</td><td>${esc(e.poster_id)}</td><td>${e.occupied===null?'Sin estado':e.occupied?'Guardado':'Disponible'}</td><td>${esc(e.location)}</td></tr>`).join('')+'</tbody></table>'+(historyRows.length?'':'<p>Sin aperturas en este rango.</p>');
 $('#history-more').hidden=!historyNext;
 }catch(e){notice(e.message);}finally{historyBusy=false;}
}
$('#history-refresh').onclick=()=>loadHistory(true);
$('#history-more').onclick=()=>loadHistory();
$('#history-filter')?.addEventListener('submit',e=>{e.preventDefault();loadHistory(true);});
$('#history-csv').onclick=async()=>{
 const button=$('#history-csv');button.disabled=true;notice('Preparando CSV…');
 try{const rows=await collectAnalytics('admin-scan-history',historyQuery,'nextCursor');downloadCsv('freak-qr-aperturas.csv',['Evento','Fecha UTC','Hora Puebla','QR','Estado al abrir','Ubicación actual'],rows.map(e=>[e.id,e.created_at,stamp(e.created_at),e.poster_id,e.occupied===null?'Sin estado':e.occupied?'Guardado':'Disponible',e.location]));notice(rows.length+' aperturas exportadas.');}catch(e){notice(e.message);}finally{button.disabled=false;}
};

let ticketRows=[],ticketNext=null,ticketSnapshot=null,ticketBusy=false,ticketQuery=new URLSearchParams({source:'all'});
async function loadTicket(reset=true){
 if(ticketBusy)return;ticketBusy=true;
 try{
 if(reset){ticketQuery=filterQuery('#analytics-filter',{source:'all'});ticketSnapshot=null;}
 const query=new URLSearchParams(ticketQuery);if(!reset&&ticketNext)query.set('cursor',ticketNext);if(ticketSnapshot)query.set('snapshot',ticketSnapshot);
 const d=await api('admin-ticket-analytics&'+query);
 ticketRows=reset?d.events:[...ticketRows,...d.events];ticketNext=d.next;ticketSnapshot=d.snapshot;
 $('#ticket-metrics').innerHTML='<div class="analytics-grid"><div><strong>'+d.totals.opens+'</strong><small>Aperturas</small></div><div><strong>'+d.totals.browsers+'</strong><small>Navegadores estimados</small></div>'+d.sources.map(v=>'<div><strong>'+v.opens+'</strong><small>'+esc(sourceLabel(v.source))+'</small></div>').join('')+'</div><p class="fine-print">Última: '+(d.totals.latest?esc(stamp(d.totals.latest)):'Sin visitas')+'</p>';
 $('#ticket-periods').innerHTML='<h3>Por día</h3><table class="analytics-table"><tr><th>Fecha</th><th>Aperturas</th><th>Navegadores</th></tr>'+d.daily.map(v=>`<tr><td>${esc(v.day)}</td><td>${v.opens}</td><td>${v.browsers}</td></tr>`).join('')+'</table><h3>Por hora · Puebla</h3><table class="analytics-table">'+d.hourly.map(v=>`<tr><td>${v.hour}:00</td><td>${v.opens}</td></tr>`).join('')+'</table>';
 $('#ticket-history').innerHTML='<table class="analytics-table"><tr><th>Hora · Puebla</th><th>Origen</th></tr>'+ticketRows.map(v=>`<tr><td>${esc(stamp(v.created_at))}</td><td>${esc(sourceLabel(v.source))}</td></tr>`).join('')+'</table>'+(ticketRows.length?'':'<p>Sin aperturas en este rango.</p>');$('#ticket-more').hidden=!ticketNext;
 }catch(e){$('#ticket-metrics').textContent='No pudimos cargar las visitas. '+e.message;}finally{ticketBusy=false;}
}
$('#analytics-filter')?.addEventListener('submit',e=>{e.preventDefault();loadTicket(true);});
$('#ticket-more').addEventListener('click',()=>loadTicket(false));
$('#ticket-csv').addEventListener('click',async()=>{
 const button=$('#ticket-csv');button.disabled=true;notice('Preparando CSV…');
 try{const rows=await collectAnalytics('admin-ticket-analytics',ticketQuery);downloadCsv('freak-enlaces-aperturas.csv',['Evento','Fecha UTC','Hora Puebla','Origen'],rows.map(e=>[e.id,e.created_at,stamp(e.created_at),sourceLabel(e.source)]));notice(rows.length+' aperturas exportadas.');}catch(e){notice(e.message);}finally{button.disabled=false;}
});

$('#reset-prize-tests').onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');if(button.disabled)return;button.disabled=true;
 try{const d=await api('admin-reset-prize-tests',{confirm:new FormData(form).get('confirm')});form.reset();await load();notice(`Listo: ${d.qr} QR disponibles. Solo se reiniciaron las pruebas de premios.`);}catch(error){notice(error.message);}finally{button.disabled=false;}
};
