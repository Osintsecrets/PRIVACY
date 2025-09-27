export function mountToPortal(el) {
  if (!el) return;
  const portal = document.getElementById('ui-portal');
  if (portal) {
    portal.appendChild(el);
  } else {
    document.body.appendChild(el);
  }
}

export function createChip(label, { onClick } = {}) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.textContent = label;
  if (typeof onClick === 'function') {
    chip.addEventListener('click', onClick);
  }
  return chip;
}

export function showToast(root, message, { timeout = 4000 } = {}) {
  if (!root) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  root.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add('toast-leave');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    window.setTimeout(() => toast.remove(), 500);
  }, timeout);
}

export function createModal({ title, subtitle, content, actions = [], onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close dialog');
  closeBtn.innerHTML = '&times;';

  const header = document.createElement('header');
  header.className = 'modal-header';
  const titleEl = document.createElement('h2');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  if (subtitle) {
    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'modal-subtitle';
    subtitleEl.textContent = subtitle;
    header.appendChild(subtitleEl);
  }

  const body = document.createElement('div');
  body.className = 'modal-body';
  if (content instanceof Node) {
    body.appendChild(content);
  } else if (typeof content === 'string') {
    const paragraph = document.createElement('p');
    paragraph.textContent = content;
    body.appendChild(paragraph);
  }

  const footer = document.createElement('footer');
  footer.className = 'modal-footer';
  actions.forEach(({ label, onClick, variant = 'primary', disabled = false }) => {
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.textContent = label;
    actionBtn.dataset.variant = variant;
    actionBtn.disabled = disabled;
    if (typeof onClick === 'function') {
      actionBtn.addEventListener('click', onClick);
    }
    footer.appendChild(actionBtn);
  });

  modal.appendChild(closeBtn);
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  backdrop.appendChild(modal);

  const focusableSelectors = 'button, [href], select, textarea, [tabindex]:not([tabindex="-1"])';
  let previousFocus = document.activeElement;

  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(modal.querySelectorAll(focusableSelectors)).filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
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

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    trapFocus(event);
  }

  function close() {
    backdrop.remove();
    modal.removeEventListener('keydown', handleKeyDown);
    backdrop.removeEventListener('click', onBackdropClick);
    if (typeof onClose === 'function') {
      onClose();
    }
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
  }

  function onBackdropClick(event) {
    if (event.target === backdrop) {
      close();
    }
  }

  closeBtn.addEventListener('click', close);
  modal.addEventListener('keydown', handleKeyDown);
  backdrop.addEventListener('click', onBackdropClick);

  return {
    element: backdrop,
    open(targetRoot = document.body) {
      const portal = document.getElementById('ui-portal');
      const host = portal || targetRoot || document.body;
      host.appendChild(backdrop);
      window.requestAnimationFrame(() => {
        const firstFocusable = modal.querySelector(focusableSelectors);
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          closeBtn.focus();
        }
      });
    },
    close,
    modal,
    body,
    header,
    footer,
    closeBtn,
  };
}

export function createPopover({ html, onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'ui-backdrop';
  backdrop.style.background = 'transparent';
  backdrop.style.backdropFilter = 'none';
  backdrop.style.zIndex = 'var(--z-popover)';
  backdrop.style.display = 'flex';
  backdrop.style.alignItems = 'center';
  backdrop.style.justifyContent = 'center';

  const panel = document.createElement('div');
  panel.className = 'popover-panel layer-popover';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.style.position = 'relative';
  panel.style.maxWidth = 'min(640px, 92vw)';
  panel.style.maxHeight = '80vh';
  panel.style.overflow = 'auto';
  panel.style.padding = '16px';
  panel.style.background = 'rgba(255,255,255,0.06)';
  panel.style.border = '1px solid rgba(255,255,255,0.12)';
  panel.style.borderRadius = '16px';
  panel.style.boxShadow = '0 20px 60px rgba(0,0,0,.6)';
  panel.innerHTML = html;
  panel.tabIndex = -1;

  backdrop.appendChild(panel);
  mountToPortal(backdrop);
  window.requestAnimationFrame(() => {
    panel.focus({ preventScroll: true });
  });

  function close() {
    try {
      backdrop.remove();
    } catch (error) {
      // ignore removal errors
    }
    document.removeEventListener('keydown', handleKeydown);
    if (typeof onClose === 'function') {
      onClose();
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      close();
    }
  });

  document.addEventListener('keydown', handleKeydown);

  return { close, el: panel, backdrop };
}

export function showTooltip(target, text) {
  if (!target) return () => {};
  const tip = document.createElement('div');
  tip.className = 'tooltip layer-popover';
  tip.setAttribute('role', 'tooltip');
  tip.textContent = text;
  tip.style.position = 'fixed';
  tip.style.padding = '8px 10px';
  tip.style.borderRadius = '8px';
  tip.style.background = 'rgba(0,0,0,.85)';
  tip.style.color = '#fff';
  tip.style.fontSize = '12px';
  tip.style.lineHeight = '1.4';
  tip.style.pointerEvents = 'auto';

  const rect = target.getBoundingClientRect();
  const maxLeft = Math.max(12, Math.min(rect.left, window.innerWidth - 220));
  tip.style.top = `${Math.min(window.innerHeight - 40, rect.bottom + 8)}px`;
  tip.style.left = `${maxLeft}px`;

  mountToPortal(tip);

  return () => {
    tip.remove();
  };
}
