(function () {
  const STORAGE_PREFIX = 'disclaimer:acknowledged:';

  function computeBasePrefix(customBase) {
    if (typeof window === 'undefined') return customBase || './';
    if (customBase) return customBase;
    const pathname = window.location.pathname || '';
    const anchor = '/PRIVACY/';
    const anchorIndex = pathname.indexOf(anchor);
    if (anchorIndex === -1) {
      return './';
    }
    const afterAnchor = pathname.slice(anchorIndex + anchor.length);
    if (!afterAnchor) {
      return './';
    }
    const segments = afterAnchor.split('/').filter(Boolean);
    const isDirectory = pathname.endsWith('/');
    const depth = Math.max(0, segments.length - (isDirectory ? 0 : 1));
    if (depth === 0) {
      return './';
    }
    return '../'.repeat(depth);
  }

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function createModalElements(options) {
    const overlay = document.createElement('div');
    overlay.className = 'disclaimer-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'disclaimer-title');
    overlay.setAttribute('aria-describedby', 'disclaimer-description');

    const focusGuardStart = document.createElement('span');
    focusGuardStart.tabIndex = 0;

    const card = document.createElement('div');
    card.className = 'disclaimer-card';

    const title = document.createElement('h2');
    title.id = 'disclaimer-title';
    title.textContent = 'Ethics & Privacy Disclaimer';

    const description = document.createElement('p');
    description.id = 'disclaimer-description';
    const disclaimerHref = options.disclaimerHref || './disclaimer/';
    description.innerHTML = `Please confirm you understand and accept our <a href="${disclaimerHref}">disclaimer</a> before exploring.`;

    const agreeButton = document.createElement('button');
    agreeButton.type = 'button';
    agreeButton.className = 'disclaimer-confirm';
    agreeButton.textContent = 'I Understand and Agree';

    const footerNote = document.createElement('p');
    footerNote.className = 'disclaimer-version';
    footerNote.textContent = options.version ? `Terms ${options.version}` : 'Terms';

    card.append(title, description, agreeButton, footerNote);

    const focusGuardEnd = document.createElement('span');
    focusGuardEnd.tabIndex = 0;

    overlay.append(focusGuardStart, card, focusGuardEnd);
    return { overlay, agreeButton, focusGuardStart, focusGuardEnd };
  }

  function applyStyles() {
    if (document.getElementById('disclaimer-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'disclaimer-modal-styles';
    style.textContent = `
      .disclaimer-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(5, 8, 13, 0.88);
        backdrop-filter: blur(6px);
        z-index: 9999;
        padding: 1.5rem;
      }
      .disclaimer-card {
        max-width: min(480px, 100%);
        background: #0f1724;
        border-radius: 1rem;
        padding: 2rem;
        color: #f8fafc;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
        text-align: left;
        display: grid;
        gap: 1.25rem;
      }
      .disclaimer-card h2 {
        margin: 0;
        font-size: 1.5rem;
      }
      .disclaimer-card p {
        margin: 0;
        line-height: 1.6;
      }
      .disclaimer-card a {
        color: #4dd0e1;
        font-weight: 600;
      }
      .disclaimer-confirm {
        justify-self: start;
        background: #4dd0e1;
        color: #082032;
        border: none;
        border-radius: 999px;
        padding: 0.75rem 1.5rem;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .disclaimer-confirm:hover,
      .disclaimer-confirm:focus-visible {
        transform: translateY(-1px);
        box-shadow: 0 12px 30px rgba(77, 208, 225, 0.35);
        outline: none;
      }
      .disclaimer-version {
        font-size: 0.85rem;
        color: rgba(248, 250, 252, 0.65);
      }
      body.disclaimer-locked {
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }

  function trapFocus(container, guards) {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea',
      'input[type="text"]',
      'input[type="radio"]',
      'input[type="checkbox"]',
      'select',
      '[tabindex]:not([tabindex="-1"])'
    ];

    function getFocusable() {
      return Array.from(container.querySelectorAll(focusableSelectors.join(','))).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
    }

    function loopFocus(event) {
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.target === guards.start && event.shiftKey) {
        event.preventDefault();
        last.focus();
      } else if (event.target === guards.end && !event.shiftKey) {
        event.preventDefault();
        first.focus();
      }
    }

    guards.start.addEventListener('focus', (event) => loopFocus(event));
    guards.end.addEventListener('focus', (event) => loopFocus(event));
  }

  function initDisclaimer(options = {}) {
    const settings = Object.assign(
      {
        requireEachVisit: false,
        version: 'v1',
        focusTrap: false,
        basePath: null
      },
      options
    );

    const storageKey = `${STORAGE_PREFIX}${settings.version}`;
    const storage = settings.requireEachVisit ? sessionStorage : localStorage;

    try {
      if (!settings.requireEachVisit && storage.getItem(storageKey)) {
        return;
      }
      if (settings.requireEachVisit && sessionStorage.getItem(storageKey)) {
        return;
      }
    } catch (error) {
      console.warn('Unable to inspect disclaimer acknowledgement', error);
    }

    ready(() => {
      const prefix = computeBasePrefix(settings.basePath);
      const disclaimerHref = `${prefix}disclaimer/`;
      applyStyles();
      const { overlay, agreeButton, focusGuardStart, focusGuardEnd } = createModalElements(
        Object.assign({}, settings, { disclaimerHref })
      );
      document.body.appendChild(overlay);
      document.body.classList.add('disclaimer-locked');

      function cleanup() {
        overlay.remove();
        document.body.classList.remove('disclaimer-locked');
      }

      agreeButton.addEventListener('click', () => {
        try {
          const targetStorage = settings.requireEachVisit ? sessionStorage : localStorage;
          targetStorage.setItem(storageKey, new Date().toISOString());
        } catch (error) {
          console.warn('Unable to persist disclaimer acknowledgement', error);
        }
        cleanup();
      });

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          agreeButton.focus({ preventScroll: true });
        }
      });

      focusGuardStart.addEventListener('focus', () => {
        agreeButton.focus({ preventScroll: true });
      });

      if (settings.focusTrap) {
        trapFocus(overlay, { start: focusGuardStart, end: focusGuardEnd });
      }

      requestAnimationFrame(() => {
        agreeButton.focus({ preventScroll: true });
      });
    });
  }

  window.Disclaimer = Object.freeze({ init: initDisclaimer });
})();
