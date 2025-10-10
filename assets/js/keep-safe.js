import { download } from './sra-utils.js';

const HABITS = [
  {t:'Review privacy settings on your top platform'},
  {t:'Rotate passwords for critical accounts; confirm 2FA'},
  {t:'Scan new photos/posts for background PII before posting'},
  {t:'Review connected apps / revoke unused'},
  {t:'Search your name/username/email for new exposures'},
  {t:'Backup codes: verify stored safely'}
];

const RKEY='sra_keepsafe_reminders';
function loadRem(){ try{ return JSON.parse(localStorage.getItem(RKEY)||'[]') }catch(e){ return [] } }
function saveRem(v){ localStorage.setItem(RKEY, JSON.stringify(v||[])); }

function renderHabits(){
  const ul=document.getElementById('habits'); ul.innerHTML='';
  HABITS.forEach((h,i)=>{
    const li=document.createElement('li'); li.className='item';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.id='h_'+i;
    const label=document.createElement('label'); label.setAttribute('for','h_'+i); label.textContent=h.t;
    ul.append(cb,label);
  });
}

function renderRem(){
  const ul=document.getElementById('rem-list'); ul.innerHTML='';
  loadRem().forEach((r,i)=>{
    const li=document.createElement('li'); li.className='item';
    li.textContent = `${r.title} — ${r.every}`;
    const rm=document.createElement('button'); rm.className='btn'; rm.textContent='Remove'; rm.onclick=()=>{ const all=loadRem(); all.splice(i,1); saveRem(all); renderRem(); };
    ul.append(li, rm);
  });
}

function addRem(){
  const t=document.getElementById('rem-title').value.trim(); const e=document.getElementById('rem-every').value;
  if(!t) return alert('Title required');
  const all=loadRem(); all.push({title:t,every:e,created:Date.now()}); saveRem(all); renderRem();
}

function exportMD(){
  const lines=['# Keep Safe — Habits & reminders',''];
  document.querySelectorAll('#habits label').forEach(l=> lines.push('- [ ] '+l.textContent));
  lines.push('\n## Reminders'); loadRem().forEach(r=> lines.push(`- ${r.title} — ${r.every}`));
  download('keepsafe.md', lines.join('\n'));
}

function bind(){
  document.getElementById('rem-add').onclick=addRem;
  document.getElementById('btn-export-md').onclick=exportMD;
  document.getElementById('btn-print').onclick=()=> window.print();
}

document.addEventListener('DOMContentLoaded', ()=>{ renderHabits(); renderRem(); bind(); });
