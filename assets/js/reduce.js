import { download } from './sra-utils.js';

const QKEY='sra_reduce_backlog';
function loadQueue(){ try{ return JSON.parse(localStorage.getItem(QKEY)||'[]') }catch(e){ return [] } }
function saveQueue(v){ localStorage.setItem(QKEY, JSON.stringify(v||[])); }

let PLAYBOOKS={};
let currentActions=[];
async function loadPlaybooks(){ const r=await fetch('../assets/data/reduce-playbooks.json'); PLAYBOOKS=await r.json(); }
const TAG_MAP = {
  'phone':'Remove phone from public; limit who can look you up by number',
  'email':'Remove email from public; limit lookups',
  'address':'Remove address; hide check-ins',
  'photo':'Review/delete risky photos; disable auto-tagging if any',
  'message':'Review DMs for PII; delete threads',
  'high-risk':'Enable 2FA; rotate passwords; review sessions'
};
function suggestionsFromBacklog(backlog){
  const set = new Set();
  backlog.forEach(i=>{
    const t=(i.note||'').toLowerCase();
    Object.keys(TAG_MAP).forEach(k=>{ if(t.includes('#'+k) || t.includes(k)) set.add(TAG_MAP[k]); });
    // add platform playbook high/medium actions for that platform
    const p = (PLAYBOOKS[i.platform]||{}).High || [];
    p.slice(0,3).forEach(a=> set.add(a));
  });
  return Array.from(set);
}
function platformActions(platform){ const p=PLAYBOOKS[platform]||{}; const out=[]; ['High','Medium','Low'].forEach(level=>{ (p[level]||[]).forEach(t=> out.push({t, level})); }); return out; }

function renderQueue(){
  const list=document.getElementById('queue'); list.innerHTML='';
  const q=loadQueue();
  if(!q.length){ list.textContent='No items queued yet.'; return; }
  q.forEach((it,idx)=>{
    const div=document.createElement('div'); div.className='item';
    div.innerHTML = `<strong>${it.platform}</strong> — ${it.title}<br/><small>${it.desc||''}</small><br/><em>${(it.note||'').slice(0,160)}</em>`;
    const done=document.createElement('button'); done.className='btn'; done.textContent='Done'; done.onclick=()=>{ const cur=loadQueue(); cur.splice(idx,1); saveQueue(cur); renderQueue(); renderActions(); };
    list.appendChild(div); list.appendChild(done);
  });
}

function renderActions(){
  const ul=document.getElementById('actions'); ul.innerHTML='';
  const backlog = JSON.parse(localStorage.getItem('sra_reduce_backlog')||'[]');
  const base = suggestionsFromBacklog(backlog);
  if(!base.length){ ul.innerHTML='<em>No suggestions yet — queue items from Analyze.</em>'; currentActions=[]; return; }
  currentActions=base;
  base.forEach((t,i)=>{
    const li=document.createElement('li'); li.className='item';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.id='a_'+i;
    const label=document.createElement('label'); label.setAttribute('for','a_'+i); label.textContent=t;
    cb.addEventListener('change',()=>{ li.classList.toggle('done', cb.checked); });
    li.append(cb,label); ul.appendChild(li);
  });
}

function exportMD(){
  const lines=['# Reduce — Action plan',''];
  const actions=[...document.querySelectorAll('#actions input')].map((cb,i)=>({t:currentActions[i]||'', done:cb.checked}));
  actions.forEach(a=>{ if(a.t){ lines.push(`- ${a.done?'[x]':'[ ]'} ${a.t}`); } });
  download('reduce_actions.md', lines.join('\n'));
}

function bind(){
  document.getElementById('btn-export-md').onclick=exportMD;
}

document.addEventListener('DOMContentLoaded', async ()=>{ await loadPlaybooks(); renderQueue(); renderActions(); bind(); });
