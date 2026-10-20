import {analyticsFilters,decodeAnalyticsCursor,analyticsPage,analyticsTimezone} from './freak-analytics.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const sources=['boleto','anuncio','general'];
export async function ticketAnalytics({req,body,q,campaign,json,admin}) {
 if(req.method==='POST'){
  const source=body.source??'boleto'; // Older printed-ticket clients omit this field.
  if(!uuid.test(body.event||'')||!uuid.test(body.visitor||'')||!sources.includes(source))return json({error:'Visita inválida.'},400);
  await q('INSERT INTO freak_ticket_open_events(id,campaign,visitor,source) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[body.event,campaign,body.visitor,source]);
  return json({ok:true});
 }
 if(!admin)return json({error:'Entra a administración.'},401);
 const {p,from,to,snapshot:givenSnapshot}=analyticsFilters(req),source=p.get('source')||'boleto';
 if(source!=='all'&&!sources.includes(source))return json({error:'Origen inválido.'},400);
 const snapshot=givenSnapshot||(await q('SELECT clock_timestamp()::text AS cutoff')).rows[0].cutoff;
 const args=[campaign,source==='all'?null:source,from,to,snapshot];
 const where="campaign=$1 AND ($2::text IS NULL OR source=$2) AND ($3::date IS NULL OR created_at>=($3::date::timestamp AT TIME ZONE 'America/Mexico_City')) AND ($4::date IS NULL OR created_at<(($4::date+1)::timestamp AT TIME ZONE 'America/Mexico_City')) AND created_at<=$5::timestamptz";
 const totals=(await q(`SELECT count(*)::int AS opens,count(DISTINCT visitor)::int AS browsers,max(created_at)::text AS latest FROM freak_ticket_open_events WHERE ${where}`,args)).rows[0];
 const bySource=(await q(`SELECT source,count(*)::int AS opens,count(DISTINCT visitor)::int AS browsers FROM freak_ticket_open_events WHERE ${where} GROUP BY source ORDER BY source`,args)).rows;
 const daily=(await q(`SELECT (created_at AT TIME ZONE 'America/Mexico_City')::date::text AS day,count(*)::int AS opens,count(DISTINCT visitor)::int AS browsers FROM freak_ticket_open_events WHERE ${where} GROUP BY 1 ORDER BY 1 DESC`,args)).rows;
 const hourly=(await q(`SELECT extract(hour FROM created_at AT TIME ZONE 'America/Mexico_City')::int AS hour,count(*)::int AS opens FROM freak_ticket_open_events WHERE ${where} GROUP BY 1 ORDER BY 1`,args)).rows;
 const cursor=decodeAnalyticsCursor(p.get('cursor'));
 // Text timestamps retain PostgreSQL microseconds at page boundaries.
 const rows=(await q(`SELECT id,created_at::text AS created_at,source FROM freak_ticket_open_events WHERE ${where} AND ($6::timestamptz IS NULL OR (created_at,id)<($6::timestamptz,$7::uuid)) ORDER BY freak_ticket_open_events.created_at DESC,id DESC LIMIT 201`,[...args,cursor?.[0]||null,cursor?.[1]||null])).rows;
 return json({totals,sources:bySource,daily,hourly,...analyticsPage(rows),snapshot,filters:{source,from,to},timezone:analyticsTimezone});
}
