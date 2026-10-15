let epoch=0,stream=null,frame=0,loading;
export function stopScanner(){epoch++;cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());stream=null;const panel=document.querySelector('#scanner');if(panel)panel.hidden=true;const video=document.querySelector('#scan-video');if(video)video.srcObject=null;}
export async function startScanner(found,notice){
 stopScanner();const run=epoch;const panel=document.querySelector('#scanner'),video=document.querySelector('#scan-video'),status=document.querySelector('#scan-status');panel.hidden=false;status.textContent='Apunta al QR del sticker.';
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Cámara no disponible. Escribe el código de cuatro caracteres.');
  let detector;try{if(globalThis.BarcodeDetector&&(await BarcodeDetector.getSupportedFormats()).includes('qr_code'))detector=new BarcodeDetector({formats:['qr_code']});}catch{}
  if(!detector&&!globalThis.jsQR){loading??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/freak/jsQR.js';s.onload=resolve;s.onerror=()=>{loading=null;s.remove();reject(Error('No se pudo cargar el lector. Escribe el código.'));};document.head.append(s);});await loading;}
  if(run!==epoch)return;
  const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  if(run!==epoch){media.getTracks().forEach(t=>t.stop());return}stream=media;video.srcObject=media;await video.play();if(run!==epoch)return;
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});let last=0;
  const tick=async ts=>{if(run!==epoch)return;if(ts-last>180&&video.readyState>=2){last=ts;try{let raw;if(detector)raw=(await detector.detect(video))[0]?.rawValue;else{canvas.width=Math.min(720,video.videoWidth);canvas.height=Math.round(canvas.width*video.videoHeight/video.videoWidth);ctx.drawImage(video,0,0,canvas.width,canvas.height);const p=ctx.getImageData(0,0,canvas.width,canvas.height);raw=globalThis.jsQR(p.data,p.width,p.height)?.data;}if(run!==epoch)return;if(raw){stopScanner();await found(raw);return}}catch{if(run!==epoch)return;status.textContent='Acerca el QR y mejora la luz.';}}if(run===epoch)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
 }catch(e){if(run!==epoch)return;stopScanner();notice(e.name==='NotAllowedError'?'Permite la cámara o escribe el código de cuatro caracteres.':e.message);}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopScanner()});window.addEventListener('pagehide',stopScanner);
