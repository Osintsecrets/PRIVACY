(function () {
  const TOKEN_KEY = 'ETHICS_PLEDGE_TOKEN';
  const TERMS_VERSION_KEY = 'TERMS_VERSION';
  const TERMS_VERSION = 'v1.0 (2025-10-03)';
  const EXEMPT_FILES = new Set(['pledge.html', 'access-denied.html']);

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

  function handleDOMContentLoaded() {
    if (shouldSkipGate()) return;
    if (hasValidPledge()) return;
    const redirectPath = computeRedirectPath();
    try {
      window.location.replace(redirectPath);
    } catch (error) {
      window.location.href = redirectPath;
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleDOMContentLoaded, { once: true });
    } else {
      handleDOMContentLoaded();
    }
  }
})();
