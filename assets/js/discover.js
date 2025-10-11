import { loadEvidence, saveEvidence } from './evidence.js';
import { bar } from '../assets/js/analytics.js';

(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const storeKey = 'sra_discover_session';
  const bankKey = 'sra_discover_bank';

  function listSessions(){ try{ return JSON.parse(localStorage.getItem(bankKey))||[] }catch(e){ return [] } }
  function saveSession(name){
    const all = listSessions().filter(s=>s.name!==name);
    all.push({name, state});
    localStorage.setItem(bankKey, JSON.stringify(all));
  }

  // Platforms and A→Z checklists (loaded from data file)
  let CHECKLISTS = {};

  async function loadSteps(){
    const res = await fetch('../assets/data/platform-steps.json');
    CHECKLISTS = await res.json();
  }

  let state = {
    platform: null,
    steps: [],
    idx: 0,
    progress: 0,
    notes: {}, // {stepIndex: note}
    subs: {} // {stepIndex: [sub labels]}
  };

  function save(){ localStorage.setItem(storeKey, JSON.stringify(state)); }
  function load(){
    try {
      const s = JSON.parse(localStorage.getItem(storeKey));
      if(s){
        state = Object.assign({}, state, s);
        state.notes = s.notes || {};
        state.subs = s.subs || {};
        state.steps = Array.isArray(s.steps) ? s.steps : [];
        if(state.platform && CHECKLISTS[state.platform]){
          const raw = CHECKLISTS[state.platform];
          const flat = [];
          Object.entries(raw).forEach(([cat, items])=>{
            (items||[]).forEach(item=> flat.push(Object.assign({}, item, {'cat': cat})));
          });
          if(flat.length){
            const previous = state.steps;
            state.steps = flat.map((item, idx)=>{
              const prev = previous[idx] || {};
              return Object.assign({}, item, {done: !!prev.done});
            });
            if(state.idx >= state.steps.length) state.idx = Math.max(0, state.steps.length-1);
          }
        }
      }
    } catch(e){}
  }

  function el(tag, attrs={}, children=[]) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k==='class') node.className=v; else if(k==='html') node.innerHTML=v; else node.setAttribute(k,v);
    });
    children.forEach(c => node.appendChild(typeof c==='string'? document.createTextNode(c): c));
    return node;
  }

  function renderPlatformPicker(){
    const picker = $('#platform-picker');
    picker.innerHTML = '';
    Object.keys(CHECKLISTS).forEach(key=>{
      const btn = el('button', {class:'btn', 'data-platform':key}, [ key.charAt(0).toUpperCase()+key.slice(1) ]);
      btn.addEventListener('click', ()=> startPlatform(key));
      picker.appendChild(btn);
    });
  }

  function startPlatform(key){
    const raw = CHECKLISTS[key] || {};
    const flat = [];
    Object.entries(raw).forEach(([cat, items])=>{
      (items||[]).forEach(item=> flat.push(Object.assign({}, item, {'cat': cat})));
    });
    state.platform = key;
    state.steps = flat.map(s=> Object.assign({}, s, {done:false}));
    state.idx = 0;
    state.notes = {};
    state.subs = {};
    save();
    $('#wizard').classList.add('active');
    renderStep();
  }

  function renderEvidence(area, idx){
    const wrap = el('div',{class:'evidence-block','data-step':idx},[]);
    const list = el('div',{class:'evidence-list'},[]);
    const name = el('input',{type:'text',placeholder:'Filename (e.g., fb_post_2023-01-12.png)',style:'width:100%'});
    const kind = el('select',{},[]);
    ['screenshot','export','link','other'].forEach(k=> kind.appendChild(el('option',{value:k},[k])));
    const cap = el('input',{type:'text',placeholder:'Short caption',style:'width:100%'});
    const add = el('button',{class:'btn',type:'button'},['Add evidence']);

    function refresh(){
      list.innerHTML='';
      (loadEvidence(idx)||[]).forEach((ev,i)=>{
        const row = el('div',{class:'evi-row'},[]);
        row.appendChild(el('span',{},[`[${ev.kind}] ${ev.name} — ${ev.caption||''}`]));
        const rm = el('button',{class:'btn ghost',type:'button'},['Remove']);
        rm.addEventListener('click',()=>{
          const cur=loadEvidence(idx);
          cur.splice(i,1);
          saveEvidence(idx,cur);
          refresh();
        });
        row.appendChild(rm);
        list.appendChild(row);
      });
    }

    add.addEventListener('click',()=>{
      const itemName = name.value.trim();
      const caption = cap.value.trim();
      if(!itemName) return;
      const cur=loadEvidence(idx);
      cur.push({name:itemName, kind:kind.value, caption});
      saveEvidence(idx,cur);
      name.value='';
      cap.value='';
      refresh();
    });
    refresh();
    wrap.append(list,name,kind,cap,add);
    area.appendChild(wrap);
  }

  function renderStep(){
    const wrap = $('#wizard');
    wrap.innerHTML = '';
    if(!state.steps || state.steps.length===0){ wrap.textContent = 'No steps.'; return; }
    const step = state.steps[state.idx];
    if(!step){ wrap.textContent = 'No steps.'; return; }

    const card = el('div',{class:'wizard-step'});
    card.appendChild(el('div',{class:'muted'},[document.createTextNode((state.idx+1)+' / '+state.steps.length+' — '+ (state.platform||''))]));
    if(step.cat){
      card.appendChild(el('div',{class:'muted'},[document.createTextNode(step.cat)]));
    }
    card.appendChild(el('h3',{},[step.t]));
    card.appendChild(el('p',{},[step.d]));

    const details = el('details',{},[]);
    details.appendChild(el('summary',{},['Add a note (optional)']));
    const ta = el('textarea',{class:'note',placeholder:'Notes, URL, path to content (e.g., Profile → Posts → 2023‑01‑12)'},[]);
    ta.value = state.notes[state.idx] || '';
    ta.addEventListener('input', ()=>{ state.notes[state.idx]=ta.value; save(); renderHeatmap(); });
    details.appendChild(ta);
    card.appendChild(details);

    const pathWrap = el('div',{},[]);
    const url = el('input',{type:'url',placeholder:'URL (optional)',style:'width:100%;margin:.25rem 0'});
    const path = el('input',{type:'text',placeholder:'Path (e.g., Profile → Posts → 2023‑01‑12)',style:'width:100%;'});
    const pathKey = 'p_'+state.idx;
    try {
      const saved = JSON.parse(localStorage.getItem(pathKey)||'null');
      if(saved){
        url.value = saved.url || '';
        path.value = saved.path || '';
      }
    } catch(e){}
    function savePath(){ localStorage.setItem(pathKey, JSON.stringify({url:url.value, path:path.value})); }
    url.addEventListener('input', savePath);
    path.addEventListener('input', savePath);
    pathWrap.append(url, path);
    card.appendChild(pathWrap);

    renderEvidence(card, state.idx);

    const tagsWrap = el('div',{class:'chips'},[]);
    // Quick chips (e.g., #high-risk)
    ['pii','phone','email','address','photo','message','high-risk'].forEach(tag=>{
      const b = el('button',{class:'btn ghost',type:'button'},['#'+tag]);
      b.addEventListener('click',()=>{
        const cur = (state.notes[state.idx]||'');
        state.notes[state.idx] = (cur + (cur? ' ':'') + '#'+tag).trim(); save(); ta.value = state.notes[state.idx]; renderHeatmap();
      });
      tagsWrap.appendChild(b);
    });
    card.appendChild(tagsWrap);

    if(Array.isArray(step.subs) && step.subs.length){
      const subsWrap = el('div',{class:'chips'},[]);
      const key = String(state.idx);
      const chosen = new Set(state.subs[key]||[]);
      step.subs.forEach((label,si)=>{
        const id = `sub_${state.idx}_${si}`;
        const box = el('div',{},[]);
        const cb = el('input',{type:'checkbox',id});
        cb.checked = chosen.has(label);
        cb.addEventListener('change', ()=>{
          const cur = new Set(state.subs[key]||[]);
          if(cb.checked) cur.add(label); else cur.delete(label);
          state.subs[key] = Array.from(cur);
          if(state.subs[key].length===0) delete state.subs[key];
          save();
        });
        const lab = el('label',{'for':id},[label]);
        box.appendChild(cb);
        box.appendChild(lab);
        subsWrap.appendChild(box);
      });
      card.appendChild(subsWrap);
    }

    const doneWrap = el('label',{},[]);
    const cb = el('input',{type:'checkbox'});
    cb.checked = !!step.done;
    cb.addEventListener('change', ()=>{ state.steps[state.idx].done = cb.checked; updateProgress(); save(); });
    doneWrap.appendChild(cb);
    doneWrap.appendChild(document.createTextNode(' Mark this step done'));
    card.appendChild(doneWrap);
    wrap.appendChild(card);

    updateProgress();
  }

  function riskScore(){
    if(!state.steps || !state.steps.length) return 0;
    let base = 0;
    state.steps.forEach((s,i)=>{
      if(s.done) base += 1;
      if((state.notes[i]||'').match(/phone|address|email|id|passport|license/i)) base += 2;
    });
    return Math.min(100, Math.round((base / (state.steps.length*3)) * 100));
  }

  function renderAnalyticsStrip(){
    if(!document.getElementById('analytics-discover')) return;
    const lbl=['phone','email','address','photo','message'];
    const counts = lbl.map(k=> (JSON.stringify(state.notes).match(new RegExp('#?'+k,'ig'))||[]).length);
    bar('analytics-discover', lbl.map(s=>s[0].toUpperCase()), counts);
  }

  function updateProgress(){
    const total = state.steps.length || 1;
    const done = state.steps.filter(s=>s.done).length;
    const pct = Math.round((done/total)*100);
    const bar = $('#progress-bar');
    if(bar) bar.style.width = pct+'%';
    const scoreEl = $('#score');
    if(scoreEl) scoreEl.textContent = riskScore();
    renderHeatmap();
    renderAnalyticsStrip();
  }

  function renderHeatmap(){
    const el = document.getElementById('heatmap'); if(!el) return;
    const cats = ['phone','email','address','photo','message'];
    const counts = cats.map(c => (JSON.stringify(state.notes).match(new RegExp(c,'ig'))||[]).length);
    const max = Math.max(1, ...counts);
    const bars = counts.map((n,i)=>`<rect x="${i*22}" y="${40-(n/max*40)}" width="18" height="${(n/max*40)}" rx="2" />`).join('');
    el.innerHTML = `<svg viewBox="0 0 120 40">${bars}</svg>`;
  }

  function runTour(){ alert('Welcome! 1) Pick a platform. 2) Follow A→Z. 3) Use PII helper. 4) Export when done.'); }

  function next(){ if(state.idx < state.steps.length-1){ state.idx++; save(); renderStep(); } }
  function prev(){ if(state.idx > 0){ state.idx--; save(); renderStep(); } }

  function exportJSON(){ const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `discover_${state.platform||'session'}.json`; a.click(); }

  async function buildMarkdown(){
    const lines=[]; lines.push(`# Discover log — ${state.platform||'unspecified'}`,'');
    state.steps.forEach((s,i)=>{
      const mark = s.done ? '✅' : '⬜';
      const note = (state.notes[i]||'').trim();
      const subs = state.subs[String(i)] || [];
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('p_'+i)||'null'); } catch(e){}
      const catLabel = s.cat || 'General';
      lines.push(`- ${mark} **${i+1}. ${catLabel} / ${s.t}** — ${s.d}`);
      if(Array.isArray(subs) && subs.length) lines.push(`  - Sub‑checks: ${subs.join(', ')}`);
      if(saved && (saved.url || saved.path)){
        if(saved.url) lines.push(`  - URL: ${saved.url}`);
        if(saved.path) lines.push(`  - Path: ${saved.path}`);
      }
      if(note) lines.push(`  - Note: ${note}`);
      const ev = loadEvidence(i);
      if(ev && ev.length){
        lines.push('  - Evidence:');
        ev.forEach(e => lines.push(`    - [${e.kind}] ${e.name}${e.caption? ' — '+e.caption: ''}`));
      }
    });
    return lines.join('\n');
  }

  async function exportMD(){
    const md = await buildMarkdown();
    const blob = new Blob([md], {type:'text/markdown'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `discover_${state.platform||'session'}.md`; a.click();
  }

  async function encryptText(text, pass){
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    const aes = await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'}, key, {name:'AES-GCM',length:256}, false, ['encrypt']);
    const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv}, aes, enc.encode(text)));
    const out = new Uint8Array(salt.length+iv.length+ct.length); out.set(salt,0); out.set(iv,16); out.set(ct,28);
    return btoa(String.fromCharCode(...out));
  }
  async function exportEncrypted(){
    const pass = prompt('Passphrase for encryption (do not forget this!)'); if(!pass) return;
    const md = await buildMarkdown();
    const payload = await encryptText(md, pass);
    const blob = new Blob([payload], {type:'text/plain'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `discover_${state.platform||'session'}.enc.txt`; a.click();
  }

  async function exportSessionEncrypted(){
    const pass = prompt('Passphrase to encrypt this session'); if(!pass) return;
    const payload = JSON.stringify(state);
    const enc = new TextEncoder(); const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyMat = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'}, keyMat, {name:'AES-GCM',length:256}, false, ['encrypt']);
    const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv}, key, enc.encode(payload)));
    const out = new Uint8Array(salt.length+iv.length+ct.length); out.set(salt,0); out.set(iv,16); out.set(ct,28);
    const b64 = btoa(String.fromCharCode(...out));
    const blob = new Blob([b64], {type:'text/plain'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`discover_session.enc.txt`; a.click();
  }
  async function importSessionEncrypted(){
    const pass = prompt('Passphrase to decrypt'); if(!pass) return;
    const file = await new Promise(r=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.txt'; inp.onchange=()=> r(inp.files[0]); inp.click(); });
    const b64 = await file.text(); const raw = Uint8Array.from(atob(b64), c=>c.charCodeAt(0));
    const salt=raw.slice(0,16), iv=raw.slice(16,28), data=raw.slice(28);
    const enc = new TextEncoder(); const keyMat = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'}, keyMat, {name:'AES-GCM',length:256}, false, ['decrypt']);
    const dec = await crypto.subtle.decrypt({name:'AES-GCM',iv}, key, data);
    const next = JSON.parse(new TextDecoder().decode(new Uint8Array(dec)));
    state = next; save(); $('#wizard').classList.add('active'); renderStep(); alert('Imported session loaded.');
  }

  function bindEvents(){
    $('#btn-prev').addEventListener('click', prev);
    $('#btn-next').addEventListener('click', next);
    $('#btn-export-json').addEventListener('click', exportJSON);
    $('#btn-export-md').addEventListener('click', exportMD);
    $('#btn-export-enc')?.addEventListener('click', ()=>{ exportEncrypted(); });
    $('#btn-export-session')?.addEventListener('click', exportSessionEncrypted);
    $('#btn-import-session')?.addEventListener('click', importSessionEncrypted);
    $('#btn-new-session').addEventListener('click', ()=>{ localStorage.removeItem(storeKey); state={platform:null,steps:[],idx:0,progress:0,notes:{}}; save(); location.reload(); });
    $('#btn-load-session').addEventListener('click', ()=>{ load(); if(state.platform){ $('#wizard').classList.add('active'); renderStep(); }});
    $('#btn-pii').addEventListener('click', ()=> $('#pii-modal').classList.add('open'));
    $('#btn-pii-close').addEventListener('click', ()=> $('#pii-modal').classList.remove('open'));
    const s = document.getElementById('search'); if(s){ s.addEventListener('input',()=>{
      const q = s.value.toLowerCase(); if(!q) return; const hit = Object.entries(state.notes).find(([i,v])=> (v||'').toLowerCase().includes(q));
      if(hit){ state.idx = parseInt(hit[0],10); save(); renderStep(); }
    }); }
    $('#btn-tour')?.addEventListener('click', runTour);
    $('#btn-print')?.addEventListener('click', ()=>{ window.print(); });
    $('#btn-save-named')?.addEventListener('click',()=>{ const input = $('#session-name'); const n = (input?.value||'').trim()||('session-'+Date.now()); save(); saveSession(n); alert('Saved: '+n); });
    $('#btn-list')?.addEventListener('click',()=>{ const all = listSessions(); const n = prompt('Type a session name to load:\n'+all.map(s=>'- '+s.name).join('\n')); const found = all.find(s=>s.name===n); if(found){ state = found.state; save(); $('#wizard').classList.add('active'); renderStep(); }});
  }

  function openPalette(){
    const q = prompt('Command (e.g., "facebook", "next", "prev", "export md")');
    if(!q) return;
    const s = q.toLowerCase();
    if(CHECKLISTS[s]) return startPlatform(s);
    if(s==='next') return next();
    if(s==='prev') return prev();
    if(s==='export md') return exportMD();
    if(s==='export json') return exportJSON();
  }

  window.addEventListener('keydown', (e)=>{
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); openPalette(); }
  });

  function diag(){
    if(location.hash!=='#debug') return;
    const d = document.createElement('pre'); d.style.whiteSpace='pre-wrap'; d.style.border='1px solid var(--line)'; d.style.padding='.5rem'; d.textContent = JSON.stringify({steps:state.steps?.length||0, notes:Object.keys(state.notes||{}).length, score:riskScore()}, null, 2);
    document.body.appendChild(d);
  }
  window.addEventListener('DOMContentLoaded', diag);

  // Init
  document.addEventListener('DOMContentLoaded', async ()=>{
    await loadSteps();
    load();
    renderPlatformPicker();
    if(state.platform){ $('#wizard').classList.add('active'); renderStep(); }
    bindEvents();
  });
})();
