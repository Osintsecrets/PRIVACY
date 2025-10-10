import { download } from './sra-utils.js';

const QKEY='sra_reduce_backlog';
function loadQueue(){ try{ return JSON.parse(localStorage.getItem(QKEY)||'[]') }catch(e){ return [] } }
function saveQueue(v){ localStorage.setItem(QKEY, JSON.stringify(v||[])); }

let PLAYBOOKS={};
let currentActions=[];
async function loadPlaybooks(){ const r=await fetch('../assets/data/reduce-playbooks.json'); PLAYBOOKS=await r.json(); }
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
  const q=loadQueue();
  const platforms=[...new Set(q.map(i=>i.platform))];
  let actions=[];
  if(platforms.length){ platforms.forEach(p=> actions = actions.concat(platformActions(p))); }
  if(!actions.length){ actions = [ {t:'Enable 2FA wherever available', level:'High'}, {t:'Remove phone/email from public pages', level:'High'} ]; }
  currentActions=actions;
  actions.forEach((a,i)=>{
    const li=document.createElement('li'); li.className='item';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.id='a_'+i;
    const label=document.createElement('label'); label.setAttribute('for','a_'+i); label.innerHTML = `<strong>[${a.level}]</strong> ${a.t}`;
    cb.addEventListener('change',()=>{ li.classList.toggle('done', cb.checked); });
    li.append(cb, label);
    ul.appendChild(li);
  });
}

function exportMD(){
  const lines=['# Reduce — Action plan',''];
  const actions=[...document.querySelectorAll('#actions input')].map((cb,i)=>({t:currentActions[i]?.t||'', level:currentActions[i]?.level||'', done:cb.checked}));
  actions.forEach(a=>{ if(a.t){ lines.push(`- ${a.done?'[x]':'[ ]'} [${a.level}] ${a.t}`); } });
  download('reduce_actions.md', lines.join('\n'));
}

function bind(){
  document.getElementById('btn-export-md').onclick=exportMD;
}

document.addEventListener('DOMContentLoaded', async ()=>{ await loadPlaybooks(); renderQueue(); renderActions(); bind(); });
