import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sendNotification} from '../netlify/functions/customer-feedback.mjs';
const record={submission_id:'qa-notification-local-only',is_test:true,branch:'upaep',visit_when:'hoy',average:4,ratings:{service_overall:4,welcome:4,speed:4,accuracy:4,return_intent:4},comment:'Validación técnica, no opinión de cliente',received_at_local:'15 octubre'};
for(const key of ['RESEND_API_KEY','SURVEY_FROM_EMAIL','SURVEY_NOTIFY_EMAIL'])delete process.env[key];
test('native form carries all five ratings and marked test subject to same-origin HTTPS',async()=>{
 let calls=0;const result=await sendNotification(record,'https://bmoodcoffee.com',async(url,options)=>{calls++;assert.equal(url,'https://bmoodcoffee.com/encuesta/');assert.equal(options.headers['content-type'],'application/x-www-form-urlencoded');const fields=new URLSearchParams(options.body);assert.equal(fields.get('form-name'),'encuesta-servicio');assert.equal(fields.get('folio'),record.submission_id);assert.match(fields.get('subject'),/PRUEBA TÉCNICA/);assert.equal(fields.get('company'),'');for(const key of Object.keys(record.ratings))assert.equal(fields.get(key),'4 / 5');return new Response('OK')});assert.equal(calls,1);assert.equal(result.status,'submitted');assert.equal(result.provider,'netlify-forms');
});
test('previews do not send real notification emails',async()=>{assert.equal((await sendNotification(record,'https://deploy-preview-17--betterland.netlify.app',()=>{throw Error('Unexpected request')})).status,'preview')});
test('rejected notification is not reported as submitted',async()=>{await assert.rejects(()=>sendNotification(record,'https://bmoodcoffee.com',async()=>new Response('',{status:503})),/notificación/)});
