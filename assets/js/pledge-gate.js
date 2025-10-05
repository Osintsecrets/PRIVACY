(function(){
  const KEY = 'sra_pledge_v1';
  const modal = document.getElementById('pledgeModal');
  const agree = document.getElementById('pledgeAgree');
  const status = document.getElementById('pledgeStatus');

  function t(key){
    // Try to pull from i18n map injected on window by i18n.js (if present)
    const lang = document.documentElement.lang || 'en';
    const STR = window.__SRA_STR || null; // optional global (see note below)
    if (STR && STR[lang] && STR[lang][key]) return STR[lang][key];
    // Fallback EN
    const EN = { 'pledge.status.agreed':'Pledge: Agreed', 'pledge.status.pending':'Pledge: Pending' };
    return EN[key] || key;
  }

  function setChip(agreed){
    if (!status) return;
    status.classList.remove('is-ok','is-warn');
    if (agreed){ status.textContent = t('pledge.status.agreed'); status.classList.add('is-ok'); }
    else { status.textContent = t('pledge.status.pending'); status.classList.add('is-warn'); }
  }

  const agreed = localStorage.getItem(KEY) === '1';
  setChip(agreed);

  if (!agreed && modal && typeof modal.showModal === 'function') {
    setTimeout(() => modal.showModal(), 600);
  }
  if (agree && modal) {
    agree.addEventListener('click', () => {
      localStorage.setItem(KEY, '1');
      setChip(true);
      modal.close();
    });
  }
})();
