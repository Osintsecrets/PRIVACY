(function(){
  const KEY = 'sra_self_audit_v1';
  const COOKIE = 'sra_phase';
  const CONFIG = {
    xpPerQuest: 5,
    xpPhaseBonus: 20,
    linear: true, // enforce D→A→R→K
    order: ['D','A','R','K'],
    cookieDays: 180,
  };

  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

  // ----- state -----
  const state = load();
  hydrateMeta();
  wireMissions();
  wireStepper();
  recalcAll();
  setActivePhase(getActivePhase());

  // ----- wiring -----
  function wireMissions(){
    $$('.mission').forEach(m => {
      const phase = m.getAttribute('data-phase');

      // Checkboxes
      $$('.quest input', m).forEach(cb => {
        cb.checked = !!state.quests[cb.dataset.quest];
        cb.addEventListener('change', () => { state.quests[cb.dataset.quest] = cb.checked; persist(); recalcPhase(m, phase); recalcAll(); });
      });

      // Notes
      const ta = $('.note', m);
      if (ta){ ta.value = state.notes[phase] || ''; ta.addEventListener('input', ()=>{ state.notes[phase] = ta.value; persist(); stamp(); }); }

      // Complete / Reset
      $('[data-complete]', m)?.addEventListener('click', ()=>{
        state.phases[phase] = true; persist(); recalcPhase(m, phase); recalcAll();
        // Advance to next phase automatically
        const next = nextPhase(phase);
        if (next) setActivePhase(next);
      });
      $('[data-reset]', m)?.addEventListener('click', ()=>{
        resetPhase(phase, m); recalcAll(); setActivePhase(phase);
      });

      recalcPhase(m, phase);
    });
  }

  function wireStepper(){
    $$('.stepper .step').forEach(btn => {
      btn.addEventListener('click', ()=>{
        const p = btn.getAttribute('data-step');
        if (isUnlocked(p)) setActivePhase(p);
      });
    });
  }

  // ----- active/linear control -----
  function getActivePhase(){
    const cookieP = readCookie(COOKIE);
    if (cookieP && CONFIG.order.includes(cookieP)) return cookieP;
    // first incomplete or last (K) if all done
    for (const p of CONFIG.order){ if (!state.phases[p]) return p; }
    return 'K';
  }

  function setActivePhase(phase){
    // Lock/Unlock according to linear progression
    CONFIG.order.forEach(p => {
      const mission = `.mission[data-phase="${p}"]`;
      const el = $(mission);
      const unlocked = isUnlocked(p);
      if (!el) return;
      if (p === phase) {
        el.classList.remove('is-locked');
        el.classList.add('is-active');
        el.classList.remove('is-collapsed');
        el.style.display = '';
      } else {
        el.classList.toggle('is-locked', !unlocked);
        el.classList.add('is-collapsed');
        el.style.display = 'none';
      }
    });

    // Stepper UI (aria + disabled)
    $$('.stepper .step').forEach(btn => {
      const p = btn.getAttribute('data-step');
      const current = p === phase;
      btn.setAttribute('aria-current', current ? 'step' : 'false');
      btn.disabled = !isUnlocked(p);
    });

    // Save active phase
    state.active = phase; persist(); writeCookie(COOKIE, phase, CONFIG.cookieDays);
    // Focus the first focusable in the active mission for keyboard users
    const first = $(`.mission[data-phase="${phase}"]`)?.querySelector('input,button,textarea,a');
    first?.focus();
  }

  function isUnlocked(phase){
    const idx = CONFIG.order.indexOf(phase);
    if (idx <= 0) return true; // D is always unlocked
    const prev = CONFIG.order[idx-1];
    return !!state.phases[prev];
  }
  function nextPhase(phase){ const idx = CONFIG.order.indexOf(phase); return CONFIG.order[idx+1] || null; }

  // ----- calculations/UI meta -----
  function recalcPhase(m, phase){
    const cbs = $$('.quest input', m);
    const done = cbs.filter(cb=>cb.checked).length;
    const total = cbs.length || 1;
    const pct = Math.round((done/total)*100);
    const badge = $('[data-phase-xp]', m); if (badge) badge.textContent = phase + ' ' + pct + '%';
    const phaseXp = done * 5 + (state.phases[phase] ? 20 : 0);
    m.setAttribute('data-xp', String(phaseXp));
    m.style.setProperty('--phase-pct', pct + '%');
  }

  function recalcAll(){
    const allCbs = $$('.quest input');
    const done = allCbs.filter(cb=>cb.checked).length;
    const total = allCbs.length || 1;
    const pct = Math.round((done/total)*100);
    $('#overallFill').style.width = pct + '%';
    $('#overallPct').textContent = pct + '%';
    $('#xpTotal')?.textContent = sumXP();
    $('#threatLabel')?.textContent = threatLabel(pct);
    updateAchievements(pct);
    stamp();
  }

  function sumXP(){ let xp = 0; $$('.mission').forEach(m => { xp += Number(m.getAttribute('data-xp')||0); }); return xp; }
  function threatLabel(pct){ if (pct < 25) return 'Exposed'; if (pct < 70) return 'Hardening'; return 'Hardened'; }

  function updateAchievements(pct){
    const a = state.ach || (state.ach = {});
    const list = $('#achList'); if (!list) return;
    function unlock(key, label){ if (!a[key]){ a[key] = true; push(label); persist(); } }
    function push(label){ const li = document.createElement('li'); li.textContent = label; list.appendChild(li); }
    list.innerHTML = '';
    Object.entries(a).forEach(([k,v])=>{ if (v) push(labelFor(k)); });
    if (sumXP() >= 10) unlock('first_steps','First Steps');
    if (state.phases.D) unlock('discovery','Discovery Done');
    if (state.phases.A) unlock('analyzer','Analyzer');
    if (state.phases.R) unlock('reducer','Reducer');
    if (state.phases.K) unlock('keeper','Keeper');
    if (pct === 100) unlock('perfect','100% Completion');
  }
  function labelFor(k){ return ({first_steps:'First Steps', discovery:'Discovery Done', analyzer:'Analyzer', reducer:'Reducer', keeper:'Keeper', perfect:'100% Completion'})[k] || k; }

  // ----- persistence -----
  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || { quests:{}, notes:{}, phases:{D:false,A:false,R:false,K:false}, ach:{}, ts:null, active:null }; }
    catch(e){ return { quests:{}, notes:{}, phases:{D:false,A:false,R:false,K:false}, ach:{}, ts:null, active:null }; }
  }
  function persist(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function stamp(){ const el = document.getElementById('lastUpdated'); if (!el) return; const d = new Date(); state.ts = d.toISOString(); persist(); el.textContent = 'Last updated: ' + d.toLocaleString(); }
  function hydrateMeta(){ if (state.ts){ const d = new Date(state.ts); const el = document.getElementById('lastUpdated'); if (el) el.textContent = 'Last updated: ' + d.toLocaleString(); } }

  // ----- cookies (privacy‑minimal: phase only) -----
  function writeCookie(name, value, days){ const d = new Date(); d.setTime(d.getTime() + (days*24*60*60*1000)); document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax'; }
  function readCookie(name){ const ca = document.cookie.split(';'); const n = name + '='; for (let c of ca){ c = c.trim(); if (c.indexOf(n)===0) return decodeURIComponent(c.substring(n.length)); } return null; }

  // ----- reset helpers -----
  function resetPhase(phase, m){
    $$('.quest input', m).forEach(cb => { cb.checked = false; delete state.quests[cb.dataset.quest]; });
    const ta = $('.note', m); if (ta){ ta.value = ''; delete state.notes[phase]; }
    state.phases[phase] = false; persist(); recalcPhase(m, phase);
  }
})();
