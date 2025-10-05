(function(){
  const KEY = 'sra_self_audit_v1';
  const CONFIG = {
    xpPerQuest: 5,
    xpPhaseBonus: 20,
    linear: false, // set to true to lock phases sequentially (D → A → R → K)
  };

  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

  const state = load();
  hydrate();
  wireMissions();
  recalcAll();

  // ------------ wiring ------------
  function wireMissions(){
    $$('.mission').forEach(m => {
      const phase = m.getAttribute('data-phase');
      const prior = prevPhase(phase);

      // Linear lock control
      if (CONFIG.linear && prior && !state.phases[prior]) {
        m.classList.add('is-locked');
        $$('input,button,textarea,a', m).forEach(el => el.setAttribute('disabled',''));
      } else {
        m.classList.remove('is-locked');
        $$('input,button,textarea,a', m).forEach(el => el.removeAttribute('disabled'));
      }

      // Checkboxes
      $$('.quest input', m).forEach(cb => {
        cb.checked = !!state.quests[cb.dataset.quest];
        cb.addEventListener('change', () => {
          state.quests[cb.dataset.quest] = cb.checked;
          persist();
          recalcPhase(m, phase);
          recalcAll();
        });
      });

      // Note
      const ta = $('.note', m);
      if (ta){
        ta.value = state.notes[phase] || '';
        ta.addEventListener('input', ()=>{ state.notes[phase] = ta.value; persist(); stamp(); });
      }

      // Complete / Reset
      $('[data-complete]', m)?.addEventListener('click', ()=>{
        state.phases[phase] = true;
        persist();
        recalcPhase(m, phase);
        wireMissions(); // unlock next if linear
        recalcAll();
      });
      $('[data-reset]', m)?.addEventListener('click', ()=>{
        resetPhase(phase, m);
        wireMissions();
        recalcAll();
      });

      recalcPhase(m, phase);
    });

    $('#resetAll')?.addEventListener('click', ()=>{ localStorage.removeItem(KEY); location.reload(); });
  }

  // ------------ calculations ------------
  function recalcPhase(m, phase){
    const cbs = $$('.quest input', m);
    const done = cbs.filter(cb=>cb.checked).length;
    const total = cbs.length || 1;
    const pct = Math.round((done/total)*100);

    const badge = $('[data-phase-xp]', m);
    if (badge) badge.textContent = phase + ' ' + pct + '%';

    // XP for this phase
    const phaseXp = done * CONFIG.xpPerQuest + (state.phases[phase] ? CONFIG.xpPhaseBonus : 0);
    m.setAttribute('data-xp', String(phaseXp));

    // Phase header meter style
    m.style.setProperty('--phase-pct', pct + '%');
  }

  function recalcAll(){
    // Overall progress
    const allCbs = $$('.quest input');
    const done = allCbs.filter(cb=>cb.checked).length;
    const total = allCbs.length || 1;
    const pct = Math.round((done/total)*100);
    const fill = $('#overallFill');
    if (fill) fill.style.width = pct + '%';
    const pctEl = $('#overallPct');
    if (pctEl) pctEl.textContent = pct + '%';

    // XP total
    const xp = sumXP();
    const xpEl = $('#xpTotal');
    if (xpEl) xpEl.textContent = xp;

    // Threat meter label
    const threat = threatLabel(pct);
    const tl = $('#threatLabel');
    if (tl) tl.textContent = threat;

    // Achievements
    updateAchievements(pct);

    // timestamp
    stamp();
  }

  function sumXP(){
    let xp = 0;
    $$('.mission').forEach(m => { xp += Number(m.getAttribute('data-xp')||0); });
    return xp;
  }

  function threatLabel(pct){
    if (pct < 25) return 'Exposed';
    if (pct < 70) return 'Hardening';
    return 'Hardened';
  }

  function updateAchievements(pct){
    const a = state.ach || (state.ach = {});
    const list = $('#achList');
    if (!list) return;

    function unlock(key, label){ if (!a[key]) { a[key] = true; pushAch(label); persist(); } }
    function pushAch(label){ const li = document.createElement('li'); li.textContent = label; list.appendChild(li); }

    // Clear and redraw current
    list.innerHTML = '';
    Object.entries(a).forEach(([k,v])=>{ if (v) pushAch(labelFor(k)); });

    // Check unlocks
    if (sumXP() >= 10) unlock('first_steps','First Steps');
    if (phaseDone('D')) unlock('discovery','Discovery Done');
    if (phaseDone('A')) unlock('analyzer','Analyzer');
    if (phaseDone('R')) unlock('reducer','Reducer');
    if (phaseDone('K')) unlock('keeper','Keeper');
    if (pct === 100) unlock('perfect','100% Completion');
  }

  function phaseDone(p){ return !!state.phases[p]; }
  function prevPhase(p){ return ({A:'D', R:'A', K:'R'})[p] || null; }

  // ------------ persistence & meta ------------
  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || { quests:{}, notes:{}, phases:{D:false,A:false,R:false,K:false}, ach:{}, ts:null }; }
    catch(e){ return { quests:{}, notes:{}, phases:{D:false,A:false,R:false,K:false}, ach:{}, ts:null }; }
  }
  function persist(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function stamp(){ const el = document.getElementById('lastUpdated'); if (!el) return; const d = new Date(); state.ts = d.toISOString(); persist(); el.textContent = 'Last updated: ' + d.toLocaleString(); }
  function hydrate(){ if (state.ts){ const d = new Date(state.ts); const el = document.getElementById('lastUpdated'); if (el) el.textContent = 'Last updated: ' + d.toLocaleString(); } }

  // ------------ reset helpers ------------
  function resetPhase(phase, m){
    $$('.quest input', m).forEach(cb => { cb.checked = false; delete state.quests[cb.dataset.quest]; });
    const ta = $('.note', m); if (ta){ ta.value = ''; delete state.notes[phase]; }
    state.phases[phase] = false;
    persist();
    recalcPhase(m, phase);
  }

  function labelFor(key){
    switch (key){
      case 'first_steps': return 'First Steps';
      case 'discovery': return 'Discovery Done';
      case 'analyzer': return 'Analyzer';
      case 'reducer': return 'Reducer';
      case 'keeper': return 'Keeper';
      case 'perfect': return '100% Completion';
      default: return key;
    }
  }
})();
