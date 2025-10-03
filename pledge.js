(function () {
  const TERMS_VERSION = 'v1.0 (2025-10-03)';
  const TOKEN_KEY = 'ETHICS_PLEDGE_TOKEN';
  const TERMS_VERSION_KEY = 'TERMS_VERSION';
  const REDIRECT_KEY = 'ETHICS_PLEDGE_REDIRECT_URL';

  function parseStoredToken(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Invalid pledge token payload', error);
      return null;
    }
  }

  function hasValidPledge() {
    if (typeof window === 'undefined') return false;
    try {
      const stored = parseStoredToken(sessionStorage.getItem(TOKEN_KEY));
      if (!stored || stored.version !== TERMS_VERSION) {
        return false;
      }
      const storedVersion = sessionStorage.getItem(TERMS_VERSION_KEY);
      if (storedVersion !== TERMS_VERSION) {
        return false;
      }
      return Boolean(typeof stored.token === 'string' && stored.token.length > 0);
    } catch (error) {
      console.warn('Unable to read pledge token', error);
      return false;
    }
  }

  if (typeof window !== 'undefined') {
    window.hasValidPledge = hasValidPledge;
    window.ETHICS_PLEDGE = Object.freeze({ TERMS_VERSION, TOKEN_KEY, TERMS_VERSION_KEY, hasValidPledge });
  }

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
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

    function generateToken() {
      if (window.crypto && window.crypto.randomUUID) {
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

  ready(initPledgePage);
})();
