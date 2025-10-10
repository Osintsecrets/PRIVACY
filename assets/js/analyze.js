import { loadDiscover, listDiscoverSessions, pickSessionByName, extractTags, download } from './sra-utils.js';

let KEYWORDS = { high:[], medium:[], low:[] };
async function loadKeywords(){
  const res = await fetch('../assets/data/analyze-keywords.json');
  KEYWORDS = await res.json();
}

let session = null; // {platform, steps, notes, ...}
let items = []; // normalized from Discover: one item per step with note

function normalize(dis){
  const out=[]; if(!dis||!dis.steps) return out;
  (dis.steps||[]).forEach((s,i)=>{
    out.push({ idx:i, title:s.t, desc:s.d, done:!!s.done, note:(dis.notes||{})[i]||'', platform: dis.platform||'unspecified', risk: inferRisk((dis.notes||{})[i]||'') });
  });
  return out;
}
function inferRisk(text){
  const t=(text||'').toLowerCase();
  if(KEYWORDS.high.some(k=>t.includes(k))) return 'high';
  if(KEYWORDS.medium.some(k=>t.includes(k))) return 'medium';
  return 'low';
}

function renderFilters(){
  const sel = document.getElementById('filter-platform'); sel.innerHTML='';
  const plats=[...new Set(items.map(i=>i.platform))];
  sel.appendChild(new Option('All platforms',''));
  plats.forEach(p=> sel.appendChild(new Option(p,p)) );
}

function renderSummary(){
  const el = document.getElementById('summary');
  const total = items.length; const hi = items.filter(i=>i.risk==='high').length; const md = items.filter(i=>i.risk==='medium').length; const lo = items.filter(i=>i.risk==='low').length;
  el.innerHTML = `<ul class="kv"><li>Total: ${total}</li><li>High: ${hi}</li><li>Medium: ${md}</li><li>Low: ${lo}</li></ul>`;
  const tags = extractTags((session||{}).notes||{}); const tagWrap = document.getElementById('tags'); tagWrap.innerHTML='';
  Object.entries(tags).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([t,c])=>{
    const b=document.createElement('button'); b.className='btn ghost'; b.textContent='#'+t+' ('+c+')'; b.onclick=()=> applySearch('#'+t); tagWrap.appendChild(b);
  });
}

function renderList(){
  const list = document.getElementById('list'); list.innerHTML='';
  const pf = document.getElementById('filter-platform').value; const rf = document.getElementById('filter-risk').value; const q = (document.getElementById('search').value||'').toLowerCase();
  items.filter(i=> (!pf||i.platform===pf) && (!rf||i.risk===rf) && (!q|| (i.note.toLowerCase().includes(q) || i.title.toLowerCase().includes(q))) ).forEach(i=>{
    const div=document.createElement('div'); div.className='item';
    const pill = document.createElement('span'); pill.className='pill '+(i.risk==='high'?'risk-high': i.risk==='medium'?'risk-med':'risk-low'); pill.textContent=i.risk;
    const h4=document.createElement('h4'); h4.textContent = i.title;
    const p=document.createElement('p'); p.className='kv'; p.textContent = i.desc;
    const note=document.createElement('p'); note.textContent = i.note||'';
    const add=document.createElement('button'); add.className='btn'; add.textContent='Send to Reduce'; add.onclick=()=> enqueueReduce(i);
    div.append(pill,h4,p,note,add); list.appendChild(div);
  });
}

function enqueueReduce(item){
  // Append to a local Reduce backlog
  const key='sra_reduce_backlog';
  const cur = JSON.parse(localStorage.getItem(key)||'[]');
  cur.push({ ...item, when: Date.now() });
  localStorage.setItem(key, JSON.stringify(cur));
  alert('Queued for Reduce: '+item.title);
}

function applySearch(q){ const s=document.getElementById('search'); s.value=q; renderList(); }

function exportMD(){
  const lines=['# Analyze — Risk triage',''];
  items.forEach(i=>{ lines.push(`- [${i.risk.toUpperCase()}] ${i.title} — ${i.desc}`); if(i.note) lines.push(`  - Note: ${i.note}`); });
  download('analyze_triage.md', lines.join('\n'));
}

function bind(){
  document.getElementById('btn-export-md').onclick=exportMD;
  document.getElementById('btn-load').onclick=()=>{
    const name = document.getElementById('choose-session').value.trim();
    session = name ? pickSessionByName(name) : loadDiscover();
    items = normalize(session);
    renderFilters(); renderSummary(); renderList();
  };
  ['filter-platform','filter-risk','search'].forEach(id=>{
    document.getElementById(id).addEventListener('input', renderList);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadKeywords();
  bind();
});
