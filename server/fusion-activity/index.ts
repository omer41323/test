import catalog from './catalog.json' with {type:'json'};
const origins=new Set(['https://test-lime-seven-43.vercel.app','https://test-omer-2e8a.vercel.app']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tokenPattern=/^[a-f0-9]{64}$/;
const kinds=new Set(['visit','project_start','project_resume','step_complete','step_skip','step_back','hint','project_complete','home']);
const dbURL=Deno.env.get('SUPABASE_URL')!;
const secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const dbHeaders:Record<string,string>={apikey:secret,'Content-Type':'application/json'};
if(!secret.startsWith('sb_secret_'))dbHeaders.Authorization='Bearer '+secret;
async function db(path:string,options:RequestInit={}){const r=await fetch(dbURL+'/rest/v1/'+path,{...options,headers:{...dbHeaders,...options.headers}});if(!r.ok)throw new Error('database');return r;}
async function hash(s:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'content-type,x-fusion-token','Access-Control-Allow-Methods':'POST,OPTIONS'};
 if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'origin'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'method'},405);
 const token=req.headers.get('x-fusion-token')||'';
 if(!tokenPattern.test(token))return reply({error:'unauthorized'},401);
 try{
  if(Number(req.headers.get('content-length')||0)>16000)return reply({error:'size'},413);
  const text=await req.text();if(text.length>16000)return reply({error:'size'},413);
  let body;try{body=JSON.parse(text);}catch{return reply({error:'json'},400);}
  if(!['ingest','read'].includes(body.op))return reply({error:'operation'},400);
  const field=body.op==='read'?'admin_hash':'participant_hash';
  const links=await (await db('fusion_track_links?select=id,label,revoked&'+field+'=eq.'+await hash(token)+'&limit=1')).json();
  const link=links[0];if(!link||link.revoked)return reply({error:'unauthorized'},401);
  if(body.op==='read'){
   const before=body.before;if(before!==undefined&&!/^\d{1,20}$/.test(String(before)))return reply({error:'cursor'},400);
   const query='fusion_track_events?select=seq,event_id,session_id,kind,lesson_id,step,client_at,received_at&link_id=eq.'+link.id+'&order=seq.desc&limit=101'+(before?'&seq=lt.'+before:'');
   const [rows,summary]=await Promise.all([db(query).then(r=>r.json()),db('rpc/fusion_track_summary',{method:'POST',body:JSON.stringify({target:link.id})}).then(r=>r.json())]);
   const more=rows.length>100;const events=rows.slice(0,100).map((e:any)=>({...e,lesson_title:catalog[e.lesson_id as keyof typeof catalog]?.title||'',step_title:catalog[e.lesson_id as keyof typeof catalog]?.steps[e.step-1]||''}));
   return reply({label:link.label,summary,events,next:more?String(events.at(-1).seq):null});
  }
  if(!Array.isArray(body.events)||body.events.length<1||body.events.length>25)return reply({error:'events'},400);
  const now=Date.now();const batch=[];
  for(const e of body.events){
   if(!e||!uuid.test(e.id)||!uuid.test(e.session)||!kinds.has(e.kind))return reply({error:'event'},400);
   const ms=Date.parse(e.at);if(!Number.isFinite(ms)||ms>now+300000||ms<now-30*86400000)return reply({error:'time'},400);
   const lesson=e.lesson==null?null:catalog[e.lesson as keyof typeof catalog];
   if(e.lesson!=null&&!lesson)return reply({error:'lesson'},400);
   if(!['visit','home'].includes(e.kind)&&!lesson)return reply({error:'lesson'},400);
   if(e.step!=null&&(!Number.isInteger(e.step)||!lesson||e.step<1||e.step>lesson.steps.length))return reply({error:'step'},400);
   batch.push({event_id:e.id,link_id:link.id,session_id:e.session,kind:e.kind,lesson_id:e.lesson??null,step:e.step??null,client_at:new Date(ms).toISOString()});
  }
  const rate=await db('fusion_track_events?select=seq&link_id=eq.'+link.id+'&received_at=gte.'+encodeURIComponent(new Date(now-60000).toISOString())+'&limit=1',{headers:{Prefer:'count=exact'}});
  const count=Number(rate.headers.get('content-range')?.split('/')[1]||0);
  if(count>240)return reply({error:'rate'},429);
  await db('fusion_track_events?on_conflict=event_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(batch)});
  return reply({ok:true,accepted:batch.map(e=>e.event_id)});
 }catch{return reply({error:'unavailable'},503);}
});
