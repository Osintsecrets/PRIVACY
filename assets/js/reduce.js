import { download } from './sra-utils.js';

const QKEY='sra_reduce_backlog';
function loadQueue(){ try{ return JSON.parse(localStorage.getItem(QKEY)||'[]') }catch(e){ return [] } }
function saveQueue(v){ localStorage.setItem(QKEY, JSON.stringify(v||[])); }

const COMMON_ACTIONS = [
  {t:'Make profile private / limit audience'},
  {t:'Remove phone number from public view'},
  {t:'Remove primary email from public view'},
  {t:'Hide friends list / followers'},
  {t:'Review and delete risky photos'},
  {t:'Untagg yourself from risky posts'},
  {t:'Disable location history / check-ins'},
  {t:'Review connected apps and remove unused'},
  {t:'Close or archive old accounts'},
  {t:'Rotate passwords & enable 2FA (use a manager)'}
];

function renderQueue(){
  const list=document.getElementById('queue'); list.innerHTML='';
  const q=loadQueue();
  if(!q.length){ list.textContent='No items queued yet.'; return; }
  q.forEach((it,idx)=>{
    const div=document.createElement('div'); div.className='item';
    div.innerHTML = `<strong>${it.platform}</strong> — ${it.title}<br/><small>${it.desc||''}</small><br/><em>${(it.note||'').slice(0,160)}</em>`;
    const done=document.createElement('button'); done.className='btn'; done.textContent='Done'; done.onclick=()=>{ const cur=loadQueue(); cur.splice(idx,1); saveQueue(cur); renderQueue(); };
    list.appendChild(div); list.appendChild(done);
  });
}

function renderActions(){
  const ul=document.getElementById('actions'); ul.innerHTML='';
  COMMON_ACTIONS.forEach((a,i)=>{
    const li=document.createElement('li'); li.className='item';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.id='a_'+i;
    const label=document.createElement('label'); label.setAttribute('for','a_'+i); label.textContent=a.t;
    cb.addEventListener('change',()=>{ li.classList.toggle('done', cb.checked); });
    li.append(cb, label); ul.appendChild(li);
  });
}

function exportMD(){
  const lines=['# Reduce — Action plan',''];
  const actions=[...document.querySelectorAll('#actions input')].map((cb,i)=>({t:COMMON_ACTIONS[i].t, done:cb.checked}));
  actions.forEach(a=>{ lines.push(`- ${a.done?'[x]':'[ ]'} ${a.t}`); });
  download('reduce_actions.md', lines.join('\n'));
}

function bind(){
  document.getElementById('btn-export-md').onclick=exportMD;
}

document.addEventListener('DOMContentLoaded', ()=>{ renderQueue(); renderActions(); bind(); });
