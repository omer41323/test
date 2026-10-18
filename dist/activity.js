const ENDPOINT='https://wvzgiwloeonaqwvlgxvm.supabase.co/functions/v1/fusion-activity';
let token='';const incoming=new URLSearchParams(location.hash.slice(1)).get('invite');
try{if(incoming&&/^[a-f0-9]{64}$/.test(incoming)){sessionStorage.setItem('fusion-invite',incoming);token=incoming;}else token=sessionStorage.getItem('fusion-invite')||'';}catch{token=incoming||'';}
if(!/^[a-f0-9]{64}$/.test(token))token='';
const prefix=token?'fusion-personal-'+token.slice(0,16)+':':'';
export const progressStorage={getItem:k=>localStorage.getItem(prefix+k),setItem:(k,v)=>localStorage.setItem(prefix+k,v),removeItem:k=>localStorage.removeItem(prefix+k)};
const queueKey=prefix+'activity-outbox';let queue=[];let sending=false;let stopped=false;
const session=crypto.randomUUID();
if(token){try{const saved=JSON.parse(localStorage.getItem(queueKey)||'[]');if(Array.isArray(saved))queue=saved.filter(e=>e&&Date.parse(e.at)>Date.now()-29*86400000).slice(-5000);}catch{}}
function persist(){try{localStorage.setItem(queueKey,JSON.stringify(queue));}catch{}}
function status(message){const notice=document.getElementById('activity-notice');if(notice)notice.textContent=message;}
async function flush(){
 if(!token||sending||stopped||!queue.length)return;
 sending=true;const batch=queue.slice(0,25);
 try{
  const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','x-fusion-token':token},body:JSON.stringify({op:'ingest',events:batch}),keepalive:true});
  if(r.status===401){stopped=true;status('הקישור האישי אינו פעיל. אפשר לתרגל, אך הפעילות אינה נשלחת.');return;}
  if(!r.ok)throw new Error('sync');
  const data=await r.json();const accepted=new Set(data.accepted||[]);queue=queue.filter(e=>!accepted.has(e.id));persist();
  status('תרגול בקישור אישי · ההתקדמות והפעולות נשמרות לצפייה של שולח הקישור.');
 }catch{status('תרגול בקישור אישי · הפעולות ממתינות לחיבור ונשלחות שוב כשהחיבור חוזר.');}
 finally{sending=false;}
}
export function logActivity(kind,lesson=null,step=null){
 if(!token||stopped)return;
 queue.push({id:crypto.randomUUID(),session,kind,lesson,step,at:new Date().toISOString()});persist();void flush();
}
if(token){
 const notice=document.createElement('p');notice.id='activity-notice';notice.className='activity-notice';notice.textContent='תרגול בקישור אישי · ההתקדמות והפעולות נשמרות לצפייה של שולח הקישור.';document.querySelector('.page-footer')?.before(notice);
 logActivity('visit');setInterval(flush,20000);window.addEventListener('online',flush);document.addEventListener('visibilitychange',()=>{if(document.hidden)void flush();});
}
