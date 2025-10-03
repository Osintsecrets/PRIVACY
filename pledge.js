(function () {
  const TERMS_VERSION = 'v1.0 (2025-10-03)';
  const TOKEN_KEY = 'ETHICS_PLEDGE_TOKEN';
  const CONFIRM_PHRASE = 'I AGREE TO USE THIS ETHICALLY';

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
      return Boolean(stored && stored.version === TERMS_VERSION && typeof stored.token === 'string' && stored.token.length > 0);
    } catch (error) {
      console.warn('Unable to read pledge token', error);
      return false;
    }
  }

  if (typeof window !== 'undefined') {
    window.hasValidPledge = hasValidPledge;
    window.ETHICS_PLEDGE = Object.freeze({ TERMS_VERSION, TOKEN_KEY, hasValidPledge });
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
    const continueButton = document.querySelector('[data-action="to-checkboxes"]');
    const scrollable = document.querySelector('[data-scrollable]');
    const scrollHint = document.querySelector('[data-scroll-hint]');
    const panes = Array.from(document.querySelectorAll('.pane'));
    const backToIntroButton = document.querySelector('[data-action="back-to-intro"]');
    const toConfirmButton = document.querySelector('[data-action="to-confirm"]');
    const backToCheckboxesButton = document.querySelector('[data-action="back-to-checkboxes"]');
    const completeButton = document.querySelector('[data-action="complete"]');
    const confirmInput = document.querySelector('#confirm-input');
    const checkboxTooltip = document.querySelector('#checkbox-tooltip');
    const checkboxes = Array.from(document.querySelectorAll('.checkbox-option input[type="checkbox"]'));

    let countdownInterval = null;
    const countdownSeconds = 8 + Math.floor(Math.random() * 5);
    let secondsRemaining = countdownSeconds;
    let countdownComplete = false;
    let scrolledToBottom = false;
    let tooltipTimeout = null;

    function showPane(index) {
      panes.forEach((pane, paneIndex) => {
        const isActive = paneIndex === index;
        pane.hidden = !isActive;
        pane.setAttribute('aria-hidden', String(!isActive));
        if (isActive) {
          const focusTarget = pane.querySelector('[data-autofocus]') || pane.querySelector('button:not([disabled]), input:not([disabled]), a[href], textarea, select, [tabindex]:not([tabindex="-1"])');
          if (focusTarget) {
            requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
          }
        }
      });
    }

    function updateCountdownDisplay() {
      if (countdownSpan) {
        countdownSpan.textContent = secondsRemaining.toString().padStart(2, '0');
      }
      if (countdownBar) {
        const progress = ((countdownSeconds - secondsRemaining) / countdownSeconds) * 100;
        countdownBar.style.width = `${Math.min(progress, 100)}%`;
      }
    }

    function maybeEnableContinue() {
      if (!continueButton) return;
      const ready = countdownComplete && scrolledToBottom;
      continueButton.disabled = !ready;
      continueButton.setAttribute('aria-disabled', String(!ready));
      if (ready) {
        continueButton.classList.add('is-ready');
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
          maybeEnableContinue();
        }
      } else {
        scrolledToBottom = false;
        if (scrollHint) {
          scrollHint.textContent = 'Scroll to the end and allow the timer to complete to enable the Continue button.';
        }
        maybeEnableContinue();
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
          maybeEnableContinue();
        }
      }, 1000);
    }

    function setAriaDisabled(button, isDisabled) {
      if (!button) return;
      button.setAttribute('aria-disabled', String(isDisabled));
      button.classList.toggle('is-disabled', isDisabled);
    }

    function updateCheckboxState() {
      const allChecked = checkboxes.every((box) => box.checked);
      setAriaDisabled(toConfirmButton, !allChecked);
      if (allChecked && checkboxTooltip) {
        checkboxTooltip.hidden = true;
      }
    }

    function showCheckboxTooltip() {
      if (!checkboxTooltip) return;
      checkboxTooltip.hidden = false;
      if (tooltipTimeout) {
        window.clearTimeout(tooltipTimeout);
      }
      tooltipTimeout = window.setTimeout(() => {
        checkboxTooltip.hidden = true;
      }, 3000);
    }

    function updateConfirmState() {
      const matches = confirmInput && confirmInput.value.trim() === CONFIRM_PHRASE;
      if (completeButton) {
        completeButton.disabled = !matches;
        completeButton.setAttribute('aria-disabled', String(!matches));
      }
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
      } catch (error) {
        console.warn('Unable to store pledge token', error);
      }
    }

    function completeFlow() {
      persistToken();
      window.location.href = './index.html';
    }

    if (continueButton) {
      continueButton.addEventListener('click', () => {
        showPane(1);
        const firstCheckbox = checkboxes[0];
        if (firstCheckbox) {
          requestAnimationFrame(() => firstCheckbox.focus({ preventScroll: true }));
        }
      });
    }

    if (backToIntroButton) {
      backToIntroButton.addEventListener('click', () => {
        showPane(0);
        if (scrollable) {
          requestAnimationFrame(() => scrollable.focus({ preventScroll: true }));
        }
      });
    }

    if (toConfirmButton) {
      const handleAttempt = (event) => {
        if (toConfirmButton.getAttribute('aria-disabled') === 'true') {
          event.preventDefault();
          showCheckboxTooltip();
          return;
        }
        showPane(2);
      };
      toConfirmButton.addEventListener('click', handleAttempt);
      toConfirmButton.addEventListener('keydown', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && toConfirmButton.getAttribute('aria-disabled') === 'true') {
          event.preventDefault();
          showCheckboxTooltip();
        }
      });
    }

    if (backToCheckboxesButton) {
      backToCheckboxesButton.addEventListener('click', () => {
        showPane(1);
        if (checkboxes.length) {
          requestAnimationFrame(() => checkboxes[0].focus({ preventScroll: true }));
        }
      });
    }

    if (completeButton) {
      completeButton.addEventListener('click', () => {
        if (completeButton.disabled) return;
        completeFlow();
      });
    }

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        updateCheckboxState();
      });
    });

    if (confirmInput) {
      confirmInput.addEventListener('input', updateConfirmState);
    }

    if (scrollable) {
      scrollable.addEventListener('scroll', handleScroll, { passive: true });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        showPane(0);
        if (continueButton) {
          requestAnimationFrame(() => continueButton.focus({ preventScroll: true }));
        }
      }
    });

    handleScroll();
    updateCheckboxState();
    updateConfirmState();
    showPane(0);
    startCountdown();
  }

  ready(initPledgePage);
})();
