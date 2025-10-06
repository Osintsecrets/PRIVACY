(function(){
  const TERMS_VERSION = 'v1.0 (2025-10-03)';
  const TOKEN_KEY = 'ETHICS_PLEDGE_TOKEN';
  const TERMS_VERSION_KEY = 'TERMS_VERSION';
  const REDIRECT_KEY = 'ETHICS_PLEDGE_REDIRECT_URL';
  const LOCAL_TOKEN_KEY = 'ETHICS_PLEDGE_TOKEN_MIRROR';
  const LOCAL_VERSION_KEY = 'ETHICS_PLEDGE_TERMS_VERSION_MIRROR';

  const modal = document.getElementById('pledgeModal');
  const agree = document.getElementById('pledgeAgree');
  const status = document.getElementById('pledgeStatus');
  const currentScript = document.currentScript;
  const scriptUrl = (() => {
    try {
      const base = currentScript?.src || './assets/js/pledge-gate.js';
      return new URL(base, window.location.href);
    } catch (error) {
      console.warn('Unable to resolve pledge gate script URL', error);
      return null;
    }
  })();
  const pledgeUrl = (() => {
    if (!scriptUrl) return './pledge.html';
    try {
      return new URL('../../pledge.html', scriptUrl).toString();
    } catch (error) {
      console.warn('Unable to resolve pledge redirect URL', error);
      return './pledge.html';
    }
  })();
  let hasRedirected = false;

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

  function parseStoredToken(raw){
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Invalid pledge token payload', error);
      return null;
    }
  }

  function isValidPayload(payload){
    return Boolean(payload && payload.version === TERMS_VERSION && typeof payload.token === 'string' && payload.token.length > 0);
  }

  function getSessionPayload(){
    try {
      const payload = parseStoredToken(sessionStorage.getItem(TOKEN_KEY));
      const storedVersion = sessionStorage.getItem(TERMS_VERSION_KEY);
      if (!payload || storedVersion !== TERMS_VERSION) return null;
      return isValidPayload(payload) ? payload : null;
    } catch (error) {
      console.warn('Unable to read pledge token from sessionStorage', error);
      return null;
    }
  }

  function getLocalPayload(){
    try {
      const payload = parseStoredToken(localStorage.getItem(LOCAL_TOKEN_KEY));
      const storedVersion = localStorage.getItem(LOCAL_VERSION_KEY);
      if (!payload || storedVersion !== TERMS_VERSION) return null;
      return isValidPayload(payload) ? payload : null;
    } catch (error) {
      console.warn('Unable to read pledge token mirror from localStorage', error);
      return null;
    }
  }

  function mirrorPayload(payload){
    try {
      localStorage.setItem(LOCAL_TOKEN_KEY, JSON.stringify(payload));
      localStorage.setItem(LOCAL_VERSION_KEY, TERMS_VERSION);
    } catch (error) {
      console.warn('Unable to mirror pledge token to localStorage', error);
    }
  }

  function persistPayload(payload){
    let stored = false;
    try {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify(payload));
      sessionStorage.setItem(TERMS_VERSION_KEY, TERMS_VERSION);
      stored = true;
    } catch (error) {
      console.warn('Unable to store pledge token in sessionStorage', error);
    }
    mirrorPayload(payload);
    try {
      localStorage.removeItem('sra_pledge_v1');
    } catch (error) {
      // ignore cleanup failures
    }
    return stored;
  }

  function ensureRedirectBookmark(){
    try {
      sessionStorage.setItem(REDIRECT_KEY, window.location.href);
    } catch (error) {
      console.warn('Unable to persist pledge redirect URL', error);
    }
  }

  function redirectToPledge(){
    if (hasRedirected) return;
    hasRedirected = true;
    ensureRedirectBookmark();
    window.location.href = pledgeUrl;
  }

  function generateToken(){
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `ethics-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }

  const sessionPayload = getSessionPayload();
  const localPayload = sessionPayload ? null : getLocalPayload();
  setChip(Boolean(sessionPayload));

  if (!sessionPayload) {
    if (localPayload && modal && typeof modal.showModal === 'function') {
      const showModal = () => {
        try {
          if (!modal.open) modal.showModal();
        } catch (error) {
          console.warn('Unable to display pledge modal', error);
          redirectToPledge();
        }
      };
      window.setTimeout(showModal, 600);

      modal.addEventListener('cancel', (event) => {
        event.preventDefault();
        redirectToPledge();
      });

      modal.addEventListener('close', () => {
        if (modal.returnValue !== 'agreed') {
          redirectToPledge();
        }
      });
    } else {
      redirectToPledge();
    }
  }

  if (agree && modal) {
    agree.addEventListener('click', () => {
      const payload = { token: generateToken(), version: TERMS_VERSION, createdAt: new Date().toISOString() };
      if (persistPayload(payload)) {
        modal.returnValue = 'agreed';
        setChip(true);
        modal.close('agreed');
      } else {
        redirectToPledge();
      }
    });
  }
})();
