const form=document.querySelector('#reset-pin');
let pin='';
form.addEventListener('submit',async event=>{
 event.preventDefault();const button=form.querySelector('button');if(button.disabled)return;button.disabled=true;
 const card=document.querySelector('#pin-card'),notice=document.querySelector('#notice'),data=new FormData(form);pin='';document.querySelector('#pin-value').textContent='';card.hidden=true;
 try{
  const r=await fetch('/api/freak?op=admin-reset-pin',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:data.get('name'),phone:data.get('phone'),confirmed:data.get('confirmed')==='on'})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'No pudimos recuperar el acceso.');
  pin=d.pin;document.querySelector('#pin-person').textContent=data.get('name')+' · '+data.get('phone');document.querySelector('#pin-value').textContent=pin;card.hidden=false;notice.textContent='PIN nuevo. El anterior y las sesiones previas dejaron de funcionar.';form.reset();
 }catch(e){notice.textContent=e.message;}finally{button.disabled=false;}
});
document.querySelector('#pin-copy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(pin);document.querySelector('#notice').textContent='PIN copiado.';}catch{document.querySelector('#notice').textContent='Selecciona el PIN y cópialo.';}
});
document.querySelector('#logout').addEventListener('click',()=>{pin='';document.querySelector('#pin-value').textContent='';document.querySelector('#pin-card').hidden=true;});
