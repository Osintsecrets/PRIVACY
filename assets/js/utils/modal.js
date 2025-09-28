export class ModalManager {
  constructor({ portalSelector = '#ui-portal', inertSelectors = ['#app', 'main', 'body'] } = {}) {
    this.portal = document.querySelector(portalSelector) || this._createPortal(portalSelector);
    this.inertSelectors = inertSelectors;
    this.activeDialog = null;
    this.previousActive = null;
    this.keydownHandler = this._handleKeydown.bind(this);
    this.focusTrapCleanup = null;
  }

  _createPortal(selector) {
    const el = document.createElement('div');
    el.id = selector.replace('#', '');
    document.body.appendChild(el);
    return el;
  }

  _getFocusable(container) {
    if (!container) return [];
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true');
  }

  _setInert(state) {
    const elements = this.inertSelectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
    elements.forEach((element) => {
      if (!element || (this.activeDialog && element.contains(this.activeDialog))) return;
      if (state) {
        element.setAttribute('inert', '');
      } else {
        element.removeAttribute('inert');
      }
    });
  }

  _focusFirst(container) {
    const focusable = this._getFocusable(container);
    if (focusable.length) {
      focusable[0].focus({ preventScroll: true });
      return () => {};
    }
    container.tabIndex = -1;
    container.focus({ preventScroll: true });
    return () => {
      container.removeAttribute('tabindex');
    };
  }

  _handleKeydown(event) {
    if (!this.activeDialog) return;
    if (event.key === 'Escape') {
      const allowEscape = this.activeDialog.dataset.escToClose === 'true';
      if (allowEscape) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
      }
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = this._getFocusable(this.activeDialog);
    if (!focusable.length) {
      event.preventDefault();
      this.activeDialog.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  open(dialogEl, { restoreFocusTo = document.activeElement, trap = true, escToClose = true } = {}) {
    if (!dialogEl || this.activeDialog === dialogEl) return;
    this.previousActive = restoreFocusTo || document.activeElement;

    dialogEl.setAttribute('role', 'dialog');
    dialogEl.setAttribute('aria-modal', 'true');
    dialogEl.dataset.escToClose = escToClose ? 'true' : 'false';

    this.portal.appendChild(dialogEl);
    this.activeDialog = dialogEl;

    this._setInert(true);
    document.documentElement.style.overflow = 'hidden';

    if (trap) {
      this.focusTrapCleanup = this._focusFirst(dialogEl);
      document.addEventListener('keydown', this.keydownHandler, true);
    }
  }

  close() {
    if (!this.activeDialog) return;
    const dialog = this.activeDialog;

    document.removeEventListener('keydown', this.keydownHandler, true);
    this._setInert(false);
    document.documentElement.style.overflow = '';

    if (typeof this.focusTrapCleanup === 'function') {
      this.focusTrapCleanup();
      this.focusTrapCleanup = null;
    }

    dialog.remove();
    this.activeDialog = null;

    if (this.previousActive && typeof this.previousActive.focus === 'function') {
      this.previousActive.focus({ preventScroll: true });
    }
    this.previousActive = null;
  }
}

export const modalManager = new ModalManager();
