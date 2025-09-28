export class ModalManager {
  constructor({ portalSelector = '#ui-portal', inertSelectors = ['#app', 'main', '#app-root'] } = {}) {
    this.portal = document.querySelector(portalSelector) || this._ensurePortal(portalSelector);
    this.inertSelectors = inertSelectors;
    this.activeDialog = null;
    this.lastFocused = null;
    this.keydownHandler = this._onKeydown.bind(this);
  }

  _ensurePortal(selector) {
    const el = document.createElement('div');
    el.id = selector.replace('#', '');
    document.body.appendChild(el);
    return el;
  }

  open(dialogEl, { restoreFocusTo = document.activeElement, trap = true, escToClose = true } = {}) {
    if (!dialogEl) return;
    this.lastFocused = restoreFocusTo || document.activeElement;

    dialogEl.setAttribute('role', 'dialog');
    dialogEl.setAttribute('aria-modal', 'true');

    this.portal.appendChild(dialogEl);
    this.activeDialog = dialogEl;

    this._setInert(true);

    document.documentElement.style.overflow = 'hidden';

    if (trap) {
      this._trapFocus(dialogEl);
      document.addEventListener('keydown', this.keydownHandler, true);
    }

    dialogEl.dataset.escToClose = String(!!escToClose);
  }

  close() {
    const dlg = this.activeDialog;
    if (!dlg) return;

    this._setInert(false);
    document.documentElement.style.overflow = '';

    document.removeEventListener('keydown', this.keydownHandler, true);

    dlg.remove();
    this.activeDialog = null;

    if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
      this.lastFocused.focus({ preventScroll: true });
    }
  }

  _onKeydown(event) {
    if (!this.activeDialog) return;
    if (event.key === 'Escape' && this.activeDialog.dataset.escToClose === 'true') {
      event.stopPropagation();
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      this._maintainFocus(event);
    }
  }

  _focusables(container) {
    if (!container) return [];
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, summary, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
  }

  _trapFocus(container) {
    const focusables = this._focusables(container);
    if (focusables.length === 0) {
      container.tabIndex = -1;
      container.focus({ preventScroll: true });
      return;
    }
    focusables[0].focus({ preventScroll: true });
  }

  _maintainFocus(event) {
    const focusables = this._focusables(this.activeDialog);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  _setInert(state) {
    this.inertSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (!element) return;
        if (this.activeDialog && element.contains(this.activeDialog)) return;
        if (state) {
          element.setAttribute('inert', '');
          element.setAttribute('aria-hidden', 'true');
        } else {
          element.removeAttribute('inert');
          element.removeAttribute('aria-hidden');
        }
      });
    });
  }
}

export const modalManager = new ModalManager();
