(function(){
  const KEY = 'sra_self_audit_v1';
  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

  const state = load();
  hydrate();
  updateOverall();

  // Event wiring
  $$('.mission').forEach(m => {
    const phase = m.getAttribute('data-phase');
    // Checkboxes
    $$('.quest input', m).forEach(cb => {
      cb.checked = !!state.quests[cb.dataset.quest];
      cb.addEventListener('change', () => { state.quests[cb.dataset.quest] = cb.checked; persist(); updatePhaseXP(m, phase); updateOverall(); });
    });
    // Note
    const ta = $('.note', m);
    if (ta){ ta.value = state.notes[phase] || ''; ta.addEventListener('input', ()=>{ state.notes[phase] = ta.value; persist(); stamp(); }); }
    // Complete / Reset
    const complete = $('[data-complete]', m);
    const reset = $('[data-reset]', m);
    complete?.addEventListener('click', ()=>{ state.phases[phase] = true; persist(); updatePhaseXP(m, phase); updateOverall(); });
    reset?.addEventListener('click', ()=>{ deletePhase(phase, m); persist(); updatePhaseXP(m, phase); updateOverall(); });
    // Initial XP state
    updatePhaseXP(m, phase);
  });

  $('#resetAll')?.addEventListener('click', ()=>{ localStorage.removeItem(KEY); location.reload(); });

  function deletePhase(phase, m){
    // Uncheck checkboxes in UI and state
    $$('.quest input', m).forEach(cb => { cb.checked = false; delete state.quests[cb.dataset.quest]; });
    const ta = $('.note', m); if (ta){ ta.value = ''; delete state.notes[phase]; }
    state.phases[phase] = false;
  }

  function updatePhaseXP(m, phase){
    const done = $$('.quest input', m).filter(cb=>cb.checked).length;
    const total = $$('.quest input', m).length || 1;
    const pct = Math.round((done/total)*100);
    const badge = $('[data-phase-xp]', m);
    if (badge) badge.textContent = phase + ' ' + pct + '%';
  }

  function updateOverall(){
    const allCbs = $$('.quest input');
    const done = allCbs.filter(cb=>cb.checked).length;
    const total = allCbs.length || 1;
    const pct = Math.round((done/total)*100);
    $('#overallFill').style.width = pct + '%';
    $('#overallPct').textContent = pct + '%';
    stamp();
  }

  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || { quests:{}, notes:{}, phases:{D:false,A:false,R:false,K:false}, ts:null }; }
    catch(e){ return { quests:{}, notes:{}, phases:{D:false,A:false,R:false,K:false}, ts:null }; }
  }
  function persist(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function stamp(){ const el = document.getElementById('lastUpdated'); if (!el) return; const d = new Date(); state.ts = d.toISOString(); persist(); el.textContent = 'Last updated: ' + d.toLocaleString(); }
  function hydrate(){ if (state.ts){ const d = new Date(state.ts); const el = document.getElementById('lastUpdated'); if (el) el.textContent = 'Last updated: ' + d.toLocaleString(); } }
})();
