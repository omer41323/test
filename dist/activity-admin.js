const endpoint='https://wvzgiwloeonaqwvlgxvm.supabase.co/functions/v1/fusion-activity';
const $=s=>document.querySelector(s);const key=new URLSearchParams(location.hash.slice(1)).get('key')||'';
const labels={visit:'כניסה לאתר',home:'חזרה לבית',project_start:'התחלת תרגול',project_resume:'המשך תרגול',step_complete:'ביצוע צעד',step_skip:'דילוג על צעד',step_back:'חזרה לצעד קודם',hint:'בקשת רמז',project_complete:'השלמה ללא דילוג'};
const date=new Intl.DateTimeFormat('he-IL',{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Jerusalem'});
const day=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Jerusalem'});
let rows=[],next=null,busy=false;
function display(){
 const filtered=rows.filter(e=>(!$('#kind-filter').value||e.kind===$('#kind-filter').value)&&(!$('#date-filter').value||day.format(new Date(e.client_at))===$('#date-filter').value));
 $('#events').replaceChildren();for(const e of filtered){const tr=document.createElement('tr');const time=document.createElement('td');time.textContent=date.format(new Date(e.client_at));if(Math.abs(Date.parse(e.received_at)-Date.parse(e.client_at))>60000){const small=document.createElement('small');small.textContent='התקבל בשרת: '+date.format(new Date(e.received_at));time.append(small);}tr.append(time);const action=document.createElement('td');const badge=document.createElement('span');badge.className='event-kind'+(e.kind==='step_skip'?' event-skip':'');badge.textContent=labels[e.kind]||e.kind;action.append(badge);tr.append(action);const lesson=document.createElement('td');lesson.textContent=e.lesson_title||'—';tr.append(lesson);const step=document.createElement('td');step.textContent=e.step?`${e.step} · ${e.step_title}`:'—';tr.append(step);$('#events').append(tr);}
 $('#empty').hidden=filtered.length>0;$('#empty').textContent=rows.length?'אין פעולות שמתאימות לסינון בשורות שנטענו.':'עדיין אין פעילות. אחרי שהחבר יפתח את הקישור ויתרגל, הפעולות יופיעו כאן.';
 $('#loaded-count').textContent=`${filtered.length} שורות מוצגות · ${rows.length} נטענו`;$('#load-more').hidden=!next;
}
async function load(more=false){
 if(busy)return;busy=true;$('#refresh').disabled=true;$('#load-more').disabled=true;
 try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-fusion-token':key},body:JSON.stringify({op:'read',...(more&&next?{before:next}:{})})});if(!r.ok)throw new Error(r.status===401?'קישור הצפייה אינו תקין או אינו פעיל.':'לא ניתן לקבל מידע כרגע. נסה לרענן.');const data=await r.json();
 $('#learner-label').textContent=data.label;const s=data.summary;$('#stat-visits').textContent=s.visits;$('#stat-steps').textContent=s.steps;$('#stat-skips').textContent=s.skips;$('#stat-completed').textContent=s.completed;$('#last-seen').textContent=s.last_seen?date.format(new Date(s.last_seen)):'טרם התקבלה פעילות';
 // Preserve older loaded history on auto-refresh; pagination remains at the oldest page.
 if(more){rows=[...rows,...data.events].filter((e,i,a)=>a.findIndex(x=>x.event_id===e.event_id)===i);next=data.next;}else{const hadOlder=rows.length>100;const merged=new Map(rows.map(e=>[e.event_id,e]));for(const e of data.events)merged.set(e.event_id,e);rows=[...merged.values()].sort((a,b)=>b.seq-a.seq);if(!hadOlder)next=data.next;}
 $('#sync-status').textContent='עודכן: '+date.format(new Date());$('#sync-status').dataset.error='false';display();
 }catch(e){$('#sync-status').textContent=e.message;$('#sync-status').dataset.error='true';}
 finally{busy=false;$('#refresh').disabled=false;$('#load-more').disabled=false;}
}
if(/^[a-f0-9]{64}$/.test(key)){$('#dashboard').hidden=false;void load();setInterval(()=>{if(!document.hidden)void load();},20000);}else $('#access-panel').hidden=false;
$('#refresh').onclick=()=>load();$('#load-more').onclick=()=>load(true);$('#kind-filter').onchange=display;$('#date-filter').onchange=display;$('#clear-filter').onclick=()=>{$('#kind-filter').value='';$('#date-filter').value='';display();};
