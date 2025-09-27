let searchId = 0;

export function debounce(fn, wait = 220) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      fn.apply(undefined, args);
    }, wait);
  };
}

export function createSearchField({ id, label, placeholder = '', onChange, delay = 220 } = {}) {
  const fieldId = id || `search-field-${searchId += 1}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'search-field';

  const labelEl = document.createElement('label');
  labelEl.className = 'search-label';
  labelEl.setAttribute('for', fieldId);
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = 'search';
  input.id = fieldId;
  input.className = 'search-input';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;

  if (typeof onChange === 'function') {
    const debounced = debounce((event) => {
      onChange(event.target.value);
    }, delay);
    input.addEventListener('input', debounced);
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.value) {
      event.preventDefault();
      input.value = '';
      if (typeof onChange === 'function') {
        onChange('');
      }
    }
  });

  wrapper.appendChild(labelEl);
  wrapper.appendChild(input);

  return { wrapper, input };
}

export function setupRovingTabIndex(container, selector, { orientation = 'horizontal', loop = true } = {}) {
  if (!container) return () => {};

  function items() {
    return Array.from(container.querySelectorAll(selector)).filter((item) => !item.disabled);
  }

  function focusItem(nextIndex, list) {
    const focusList = list || items();
    if (!focusList.length) return;
    const index = Math.max(0, Math.min(nextIndex, focusList.length - 1));
    focusList.forEach((item, itemIndex) => {
      item.tabIndex = itemIndex === index ? 0 : -1;
    });
    const target = focusList[index];
    if (target) {
      target.focus();
    }
  }

  function handleKeyDown(event) {
    const focusList = items();
    if (!focusList.length) return;
    const currentIndex = focusList.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    const forwardKeys = orientation === 'vertical'
      ? ['ArrowDown']
      : orientation === 'both'
        ? ['ArrowRight', 'ArrowDown']
        : ['ArrowRight'];
    const backwardKeys = orientation === 'vertical'
      ? ['ArrowUp']
      : orientation === 'both'
        ? ['ArrowLeft', 'ArrowUp']
        : ['ArrowLeft'];

    if (event.key === 'Home') {
      event.preventDefault();
      focusItem(0, focusList);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusItem(focusList.length - 1, focusList);
      return;
    }
    if (forwardKeys.includes(event.key)) {
      event.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex >= focusList.length) {
        focusItem(loop ? 0 : focusList.length - 1, focusList);
      } else {
        focusItem(nextIndex, focusList);
      }
    } else if (backwardKeys.includes(event.key)) {
      event.preventDefault();
      const nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        focusItem(loop ? focusList.length - 1 : 0, focusList);
      } else {
        focusItem(nextIndex, focusList);
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);
  return () => container.removeEventListener('keydown', handleKeyDown);
}

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

export function createModal({ title, subtitle, content, actions = [], onClose, closeOnEscape = false }) {
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
    const focusable = Array.from(modal.querySelectorAll(focusableSelectors)).filter((el) => !el.disabled && el.offsetParent !== null);
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
    if (event.key === 'Escape' && closeOnEscape) {
      event.preventDefault();
      close();
      return;
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
        const focusable = Array.from(modal.querySelectorAll(focusableSelectors)).filter((el) => !el.disabled && el.offsetParent !== null);
        if (focusable.length) {
          focusable[0].focus();
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
    backdrop.remove();
    if (typeof onClose === 'function') {
      onClose();
    }
  }

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      close();
    }
  });

  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });

  return {
    close,
    el: panel,
  };
}
