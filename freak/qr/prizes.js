const dialog=document.querySelector('#prize-dialog'),open=document.querySelector('#prizes-open');
function close(){dialog.close();}
open.addEventListener('click',()=>{dialog.showModal();document.querySelector('#prizes-close').focus();});
document.querySelector('#prizes-close').addEventListener('click',close);
dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
document.querySelector('#prizes-to-account').addEventListener('click',()=>{close();document.querySelector('#account').scrollIntoView({block:'start'});document.querySelector('#account input')?.focus({preventScroll:true});});
// Keep the existing guarded selection/validation flow; close before its handler scrolls.
document.querySelector('#prizes').addEventListener('click',event=>{const button=event.target.closest('[data-prize]');if(button&&!button.disabled)close();},true);
