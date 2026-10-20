// Shared, parameterized filters and precise cursors for private analytics.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const invalid=message=>{throw Object.assign(new Error(message),{status:400,code:'analytics'});};
const date=value=>{
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)invalid('Fecha inválida.');
 return value;
};
export function analyticsFilters(req){
 const p=new URL(req.url).searchParams,from=date(p.get('from')),to=date(p.get('to'));
 if(from&&to&&from>to)invalid('Revisa el rango de fechas.');
 const snapshot=p.get('snapshot')||null;
 if(snapshot&&!Number.isFinite(Date.parse(snapshot)))invalid('Corte inválido.');
 return {p,from,to,snapshot};
}
export function decodeAnalyticsCursor(value){
 if(!value)return null;
 try{const v=JSON.parse(Buffer.from(value,'base64url').toString());if(!Array.isArray(v)||v.length!==2||!Number.isFinite(Date.parse(v[0]))||!uuid.test(v[1]))invalid('Cursor inválido.');return v;}catch{invalid('Cursor inválido.');}
}
export function analyticsPage(rows){
 const more=rows.length>200;rows.splice(200);const last=rows.at(-1);
 return {events:rows,next:more?Buffer.from(JSON.stringify([last.created_at,last.id])).toString('base64url'):null};
}
export const analyticsTimezone='America/Mexico_City';
