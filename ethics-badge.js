(function () {
  function initEthicsBadge(options = {}) {
    if (typeof document === 'undefined') return;
    if (document.querySelector('.ethics-badge-container')) return;

    const target = options.containerSelector ? document.querySelector(options.containerSelector) : document.body;
    if (!target) return;

    const container = document.createElement('div');
    container.className = 'ethics-badge-container';
    container.setAttribute('aria-live', 'polite');

    const badge = document.createElement('div');
    badge.className = 'ethics-badge';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'ethics-popover');
    trigger.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm1 4.25h-2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1z"/></svg>
      Ethics-First
    `;

    const popover = document.createElement('div');
    popover.className = 'ethics-popover';
    popover.id = 'ethics-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'false');
    popover.setAttribute('aria-hidden', 'true');

    popover.innerHTML = `
      <h3>Ethics Reminder</h3>
      <ul>
        <li>Public ≠ Permission</li>
        <li>No doxxing, ever</li>
        <li>Use power to protect</li>
      </ul>
      <div class="ethics-links">
        <a href="/ethics.html">Ethics Policy</a> · <a href="/disclaimer.html">Disclaimer</a>
      </div>
      <div class="ethics-popover-footer">
        <span>Terms v1.0</span>
        <button type="button" class="ethics-popover-close">Close</button>
      </div>
    `;

    const closeButton = popover.querySelector('.ethics-popover-close');
    const links = Array.from(popover.querySelectorAll('a'));

    function getFocusableElements() {
      return [closeButton, ...links].filter(Boolean);
    }

    let isOpen = false;

    function setOpen(nextState) {
      isOpen = nextState;
      popover.dataset.open = String(isOpen);
      popover.setAttribute('aria-hidden', String(!isOpen));
      trigger.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        const focusable = getFocusableElements();
        if (focusable.length) {
          focusable[0].focus();
        }
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleKeydown);
      } else {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('keydown', handleKeydown);
        trigger.focus({ preventScroll: true });
      }
    }

    function handleOutsideClick(event) {
      if (!popover.contains(event.target) && event.target !== trigger) {
        setOpen(false);
      }
    }

    function handleKeydown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key === 'Tab' && isOpen) {
        const focusable = getFocusableElements();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    trigger.addEventListener('click', () => {
      setOpen(!isOpen);
    });

    closeButton?.addEventListener('click', () => setOpen(false));

    badge.appendChild(trigger);
    badge.appendChild(popover);
    container.appendChild(badge);
    target.appendChild(container);
  }

  if (typeof window !== 'undefined') {
    window.initEthicsBadge = initEthicsBadge;
  }
})();
