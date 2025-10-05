(function () {
  const TOKEN_KEY = 'ETHICS_PLEDGE_TOKEN';
  const TERMS_VERSION_KEY = 'TERMS_VERSION';
  const TERMS_VERSION = 'v1.0 (2025-10-03)';
  const EXEMPT_FILES = new Set(['pledge.html', 'access-denied.html']);
  const REDIRECT_KEY = 'ETHICS_PLEDGE_REDIRECT_URL';

  function parseToken(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Invalid pledge token payload', error);
      return null;
    }
  }

  function storageHasValidPledge() {
    if (typeof window === 'undefined') return false;
    try {
      const stored = parseToken(sessionStorage.getItem(TOKEN_KEY));
      if (!stored || typeof stored.token !== 'string' || stored.token.length === 0) {
        return false;
      }
      if (stored.version !== TERMS_VERSION) {
        return false;
      }
      const storedVersion = sessionStorage.getItem(TERMS_VERSION_KEY);
      if (storedVersion !== TERMS_VERSION) {
        return false;
      }
      return true;
    } catch (error) {
      console.warn('Unable to read pledge token', error);
      return false;
    }
  }

  function hasValidPledge() {
    if (typeof window === 'undefined') return false;
    if (window.ETHICS_PLEDGE && typeof window.ETHICS_PLEDGE.hasValidPledge === 'function') {
      try {
        return Boolean(window.ETHICS_PLEDGE.hasValidPledge());
      } catch (error) {
        console.warn('Error invoking ETHICS_PLEDGE.hasValidPledge', error);
      }
    }
    if (typeof window.hasValidPledge === 'function') {
      try {
        return Boolean(window.hasValidPledge());
      } catch (error) {
        console.warn('Error invoking hasValidPledge', error);
      }
    }
    return storageHasValidPledge();
  }

  if (typeof window !== 'undefined') {
    window.hasValidPledge = hasValidPledge;
    window.ETHICS_PLEDGE = Object.freeze({ TERMS_VERSION, TOKEN_KEY, TERMS_VERSION_KEY, hasValidPledge });
  }

  function shouldSkipGate() {
    if (typeof window === 'undefined') return true;
    const path = window.location.pathname;
    const pathWithoutTrailingSlash = path.replace(/\/+$/, '/');
    const segments = pathWithoutTrailingSlash.split('/').filter(Boolean);
    const lastSegment = segments.length ? segments[segments.length - 1] : '';
    if (EXEMPT_FILES.has(lastSegment)) {
      return true;
    }
    if (!lastSegment && segments.length) {
      const parentSegment = segments[segments.length - 1];
      if (EXEMPT_FILES.has(`${parentSegment}.html`)) {
        return true;
      }
    }
    return false;
  }

  function computeRedirectPath() {
    if (typeof window === 'undefined') return './pledge.html';
    let baseHref = window.location.href;
    if (typeof document !== 'undefined') {
      const brand = document.querySelector('.brand[href]');
      if (brand) {
        const href = brand.getAttribute('href') || './';
        try {
          baseHref = new URL(href, window.location.href).href;
        } catch (error) {
          console.warn('Unable to resolve brand href for pledge redirect', error);
        }
      }
    }
    let pledgeUrl;
    try {
      pledgeUrl = new URL('./pledge.html', baseHref);
    } catch (error) {
      console.warn('Unable to resolve pledge redirect URL', error);
      return './pledge.html';
    }
    if (pledgeUrl.origin === window.location.origin) {
      return pledgeUrl.pathname + pledgeUrl.search + pledgeUrl.hash;
    }
    return pledgeUrl.href;
  }

  function generateToken() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `ethics-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }

  function persistToken() {
    const payload = { token: generateToken(), version: TERMS_VERSION, createdAt: new Date().toISOString() };
    try {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify(payload));
      sessionStorage.setItem(TERMS_VERSION_KEY, TERMS_VERSION);
    } catch (error) {
      console.warn('Unable to store pledge token', error);
    }
  }

  function consumeStoredRedirectUrl() {
    try {
      const stored = sessionStorage.getItem(REDIRECT_KEY);
      if (stored) {
        sessionStorage.removeItem(REDIRECT_KEY);
      }
      return stored;
    } catch (error) {
      console.warn('Unable to read stored redirect URL', error);
      return null;
    }
  }

  function translate(key, fallback) {
    if (typeof window !== 'undefined' && window.I18N && typeof window.I18N.t === 'function') {
      try {
        const value = window.I18N.t(key);
        if (value && value !== key) {
          return value;
        }
      } catch (error) {
        console.error('Unable to translate key', key, error);
      }
    }
    return fallback;
  }

  function ready(callback) {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function initHomeLanding() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('pledgeModal');
    if (!modal) return;
    const statusButton = document.getElementById('pledgeStatus');
    const agreeButton = document.getElementById('pledgeAgree');
    const readButton = document.getElementById('pledgeRead');
    const owner = 'pledge';
    const overlayController = typeof window !== 'undefined' ? window.__UIOverlay : null;
    const overlayElement = document.getElementById('ui-overlay');
    const inertTargets = [
      document.getElementById('main'),
      document.getElementById('site-footer') || document.querySelector('footer'),
      document.querySelector('header')
    ];

    function setInert(state) {
      if (overlayController && typeof overlayController.inert === 'function') {
        inertTargets.forEach((target) => overlayController.inert(target, owner, state));
        return;
      }
      inertTargets.forEach((target) => {
        if (!target) return;
        if (state) {
          target.setAttribute('inert', '');
        } else {
          target.removeAttribute('inert');
        }
      });
    }

    function showOverlay() {
      if (overlayController) {
        if (typeof overlayController.show === 'function') overlayController.show(owner);
        if (typeof overlayController.lock === 'function') overlayController.lock(owner);
      } else {
        if (overlayElement) overlayElement.setAttribute('aria-hidden', 'false');
        if (document.body) document.body.classList.add('is-locked');
      }
    }

    function hideOverlay() {
      if (overlayController) {
        if (typeof overlayController.hide === 'function') overlayController.hide(owner);
        if (typeof overlayController.unlock === 'function') overlayController.unlock(owner);
      } else {
        if (overlayElement) overlayElement.setAttribute('aria-hidden', 'true');
        if (document.body) document.body.classList.remove('is-locked');
      }
    }

    function openModal() {
      showOverlay();
      setInert(true);
      if (typeof modal.showModal === 'function') {
        try {
          if (!modal.open) modal.showModal();
        } catch (error) {
          console.warn('Unable to open pledge modal', error);
          modal.setAttribute('open', '');
        }
      } else {
        modal.setAttribute('open', '');
      }
      modal.setAttribute('data-open', 'true');
    }

    function closeModal() {
      if (typeof modal.close === 'function') {
        try {
          modal.close();
        } catch (error) {
          modal.removeAttribute('open');
        }
      } else {
        modal.removeAttribute('open');
      }
      modal.removeAttribute('data-open');
      hideOverlay();
      setInert(false);
    }

    modal.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeModal();
    });

    modal.addEventListener('close', () => {
      hideOverlay();
      setInert(false);
    });

    function updateStatus() {
      const signed = hasValidPledge();
      if (statusButton) {
        const key = signed ? 'pledge.statusComplete' : 'pledge.statusRequired';
        const fallback = signed ? 'Pledge signed' : 'Pledge required';
        const label = translate(key, fallback);
        statusButton.textContent = label;
        statusButton.dataset.state = signed ? 'complete' : 'required';
        statusButton.setAttribute('aria-label', label);
      }
      if (signed) {
        closeModal();
      }
      return signed;
    }

    function handleAgree() {
      persistToken();
      const redirect = consumeStoredRedirectUrl();
      const signed = updateStatus();
      closeModal();
      if (redirect && signed) {
        window.location.href = redirect;
        return;
      }
      if (statusButton) {
        statusButton.focus();
      }
    }

    if (statusButton) {
      statusButton.addEventListener('click', () => openModal());
    }

    if (agreeButton) {
      agreeButton.addEventListener('click', handleAgree);
    }

    if (readButton) {
      readButton.addEventListener('click', () => {
        window.location.href = './ethics.html';
      });
    }

    if (window.I18N && typeof window.I18N.onChange === 'function') {
      window.I18N.onChange(() => updateStatus());
    }

    const alreadySigned = updateStatus();
    if (!alreadySigned) {
      openModal();
    }
  }

  function handleGate() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('pledgeModal')) {
      initHomeLanding();
      return;
    }
    if (shouldSkipGate()) return;
    if (hasValidPledge()) return;
    const redirectPath = computeRedirectPath();
    try {
      try {
        sessionStorage.setItem(REDIRECT_KEY, window.location.href);
      } catch (storageError) {
        console.warn('Unable to store requested URL for pledge redirect', storageError);
      }
      window.location.replace(redirectPath);
    } catch (error) {
      window.location.href = redirectPath;
    }
  }

  function initPledgePage() {
    const pageRoot = document.body;
    if (!pageRoot || !pageRoot.hasAttribute('data-pledge-page')) return;

    const countdownSpan = document.querySelector('[data-countdown]');
    const countdownChip = countdownSpan ? countdownSpan.parentElement : null;
    const countdownBar = document.querySelector('.scroll-progress-bar');
    const completeButton = document.querySelector('[data-action="complete"]');
    const scrollable = document.querySelector('[data-scrollable]');
    const scrollHint = document.querySelector('[data-scroll-hint]');

    let countdownInterval = null;
    const countdownSeconds = 8 + Math.floor(Math.random() * 5);
    let secondsRemaining = countdownSeconds;
    let countdownComplete = false;
    let scrolledToBottom = false;

    function updateCountdownDisplay() {
      if (countdownSpan) {
        countdownSpan.textContent = secondsRemaining.toString().padStart(2, '0');
      }
      if (countdownBar) {
        const progress = ((countdownSeconds - secondsRemaining) / countdownSeconds) * 100;
        countdownBar.style.width = `${Math.min(progress, 100)}%`;
      }
    }

    function maybeEnableComplete() {
      if (!completeButton) return;
      const ready = countdownComplete && scrolledToBottom;
      completeButton.disabled = !ready;
      completeButton.setAttribute('aria-disabled', String(!ready));
      if (ready) {
        completeButton.classList.add('is-ready');
      }
    }

    function handleScroll() {
      if (!scrollable) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const progress = (scrollTop + clientHeight) / scrollHeight;
      if (progress >= 0.98) {
        if (!scrolledToBottom) {
          scrolledToBottom = true;
          if (scrollHint) {
            scrollHint.textContent = 'Thank you for reading — the timer will finish shortly.';
          }
          maybeEnableComplete();
        }
      } else {
        scrolledToBottom = false;
        if (scrollHint) {
          scrollHint.textContent = 'Scroll to the end and allow the timer to complete to enable the Enter Site button.';
        }
        maybeEnableComplete();
      }
    }

    function startCountdown() {
      updateCountdownDisplay();
      countdownInterval = window.setInterval(() => {
        secondsRemaining = Math.max(0, secondsRemaining - 1);
        updateCountdownDisplay();
        if (secondsRemaining === 0) {
          countdownComplete = true;
          window.clearInterval(countdownInterval);
          if (countdownChip) {
            countdownChip.textContent = 'Timer complete';
          }
          maybeEnableComplete();
        }
      }, 1000);
    }

    function completeFlow() {
      persistToken();
      const redirectUrl = consumeStoredRedirectUrl();
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      window.location.href = './index.html';
    }

    if (completeButton) {
      completeButton.addEventListener('click', () => {
        if (completeButton.disabled) return;
        completeFlow();
      });
    }

    if (scrollable) {
      scrollable.addEventListener('scroll', handleScroll, { passive: true });
    }

    handleScroll();
    maybeEnableComplete();
    startCountdown();
  }

  ready(() => {
    handleGate();
    initPledgePage();
  });
})();
