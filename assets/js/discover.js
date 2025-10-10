(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const storeKey = 'sra_discover_session';

  // Platforms and A→Z checklists (Facebook: detailed; others: stubs you can extend later)
  const CHECKLISTS = {
    facebook: [
      {t:'Profile header', d:'Open your profile. Record display name, username/vanity URL, profile URL. Note account type (personal/business, public/private).'},
      {t:'Cover/banner photos', d:'Review all cover photos. Inspect comments & likes. Look for background info (street signs, school, plates).'},
      {t:'Profile photo', d:'Does it reveal face, uniform, workplace, school?'},
      {t:'Bio / About', d:'Work, education, hometown/current city, relationship, websites. Any PII?'},
      {t:'Contact info', d:'Phone, email, address visible? Note and flag PII.'},
      {t:'Friends / Followers / Following', d:'Counts; unknown contacts; sensitive connections (employer, family).'},
      {t:'Photos & Albums', d:'Own photos + tagged photos. Sensitive media? Location clues?'},
      {t:'Posts by you', d:'Scan recent posts; then older posts (>2y). Flag high-risk posts and copy URLs/paths.'},
      {t:'Posts you are tagged in', d:'Review visibility; consider untagging later.'},
      {t:'Stories / Reels', d:'Anything risky archived or highlighted?'},
      {t:'Groups', d:'Public groups revealing interests/location?'},
      {t:'Pages liked / Follows', d:'Pages that reveal politics, religion, employer, minors’ schools.'},
      {t:'Events / Check-ins', d:'Past events expose routine or home/work?'},
      {t:'Marketplace', d:'Listings with phone, address, license plate in photos?'},
      {t:'Search your name on Facebook', d:'Search variations of your name/username; see what’s discoverable.'},
      {t:'Apps & Integrations', d:'Third-party apps connected?'},
      {t:'Devices & Sessions', d:'Review logged-in devices (Settings > Security).'},
      {t:'Messages (optional)', d:'If auditing DMs, look for shared PII (phones, addresses).'},
      {t:'Cross-links', d:'Links to other platforms in bio/posts.'}
    ],
    instagram: [
      {t:'Profile basics', d:'Name, username, bio, link-in-bio; account type; public/private.'},
      {t:'Posts & Highlights', d:'Photos/videos; background clues; tagged posts.'}
    ],
    x: [
      {t:'Profile basics', d:'Display name, handle, bio, location, website; public/private.'},
      {t:'Tweets', d:'Old tweets; media; replies exposing PII; external links.'}
    ],
    tiktok: [
      {t:'Profile basics', d:'Display name, username, bio; links; public/private.'},
      {t:'Videos', d:'Backgrounds; captions; geotags.'}
    ],
    whatsapp: [
      {t:'Profile basics', d:'Name, photo, about; privacy settings.'},
      {t:'Groups', d:'Group names; participants visible; exported media.'}
    ]
  };

  let state = {
    platform: null,
    steps: [],
    idx: 0,
    progress: 0,
    notes: {} // {stepIndex: note}
  };

  function save(){ localStorage.setItem(storeKey, JSON.stringify(state)); }
  function load(){ try { const s = JSON.parse(localStorage.getItem(storeKey)); if(s) state = s; } catch(e){} }

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
    state.platform = key; state.steps = CHECKLISTS[key].map(s=>({...s, done:false})); state.idx = 0; state.notes = {}; save();
    $('#wizard').classList.add('active');
    renderStep();
  }

  function renderStep(){
    const wrap = $('#wizard');
    wrap.innerHTML = '';
    if(!state.steps || state.steps.length===0){ wrap.textContent = 'No steps.'; return; }
    const step = state.steps[state.idx];

    const card = el('div',{class:'wizard-step'});
    card.appendChild(el('div',{class:'muted'},[document.createTextNode((state.idx+1)+' / '+state.steps.length+' — '+ (state.platform||''))]));
    card.appendChild(el('h3',{},[step.t]));
    card.appendChild(el('p',{},[step.d]));

    const details = el('details',{},[]);
    details.appendChild(el('summary',{},['Add a note (optional)']));
    const ta = el('textarea',{class:'note',placeholder:'Notes, URL, path to content (e.g., Profile → Posts → 2023‑01‑12)'},[]);
    ta.value = state.notes[state.idx] || '';
    ta.addEventListener('input', ()=>{ state.notes[state.idx]=ta.value; save(); });
    details.appendChild(ta);
    card.appendChild(details);

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

  function updateProgress(){
    const total = state.steps.length || 1;
    const done = state.steps.filter(s=>s.done).length;
    const pct = Math.round((done/total)*100);
    $('#progress-bar').style.width = pct+'%';
  }

  function next(){ if(state.idx < state.steps.length-1){ state.idx++; save(); renderStep(); } }
  function prev(){ if(state.idx > 0){ state.idx--; save(); renderStep(); } }

  function exportJSON(){ const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `discover_${state.platform||'session'}.json`; a.click(); }

  function exportMD(){
    const lines = [];
    lines.push(`# Discover log — ${state.platform||'unspecified'}`);
    lines.push('');
    state.steps.forEach((s,i)=>{
      const mark = s.done ? '✅' : '⬜';
      const note = (state.notes[i]||'').trim();
      lines.push(`- ${mark} **${i+1}. ${s.t}** — ${s.d}`);
      if(note) lines.push(`  - Note: ${note}`);
    });
    const blob = new Blob([lines.join('\n')], {type:'text/markdown'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `discover_${state.platform||'session'}.md`; a.click();
  }

  function bindEvents(){
    $('#btn-prev').addEventListener('click', prev);
    $('#btn-next').addEventListener('click', next);
    $('#btn-export-json').addEventListener('click', exportJSON);
    $('#btn-export-md').addEventListener('click', exportMD);
    $('#btn-new-session').addEventListener('click', ()=>{ localStorage.removeItem(storeKey); state={platform:null,steps:[],idx:0,progress:0,notes:{}}; save(); location.reload(); });
    $('#btn-load-session').addEventListener('click', ()=>{ load(); if(state.platform){ $('#wizard').classList.add('active'); renderStep(); }});
    $('#btn-pii').addEventListener('click', ()=> $('#pii-modal').classList.add('open'));
    $('#btn-pii-close').addEventListener('click', ()=> $('#pii-modal').classList.remove('open'));
  }

  // Init
  document.addEventListener('DOMContentLoaded', ()=>{
    load();
    renderPlatformPicker();
    if(state.platform){ $('#wizard').classList.add('active'); renderStep(); }
    bindEvents();
  });
})();
