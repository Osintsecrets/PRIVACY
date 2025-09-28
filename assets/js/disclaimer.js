import { translate, applyTranslations, onLanguageChange } from './i18n.js';
import { modalManager } from './utils/modal.js';

function escapeHTML(value) {
  return value.replace(/[&<>"']+/g, (match) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[match] || match;
  });
}

function formatDisclaimerText(raw) {
  const normalized = raw.replace(/\r\n/g, '\n');
  const trimmed = normalized.trim();
  if (!trimmed) {
    return `<p>${translate('disclaimer.empty')}</p>`;
  }
  return trimmed
    .split(/\n\s*\n/g)
    .map((paragraph) => `<p>${escapeHTML(paragraph.trim())}</p>`)
    .join('');
}

let modalElement = null;
let contentElement = null;
let agreeButton = null;
let disagreeButton = null;
let leaveLink = null;
let titleElement = null;
let hasLoadedDisclaimer = false;
let isOpen = false;

function handleContentScroll() {
  if (!contentElement || !agreeButton) return;
  if (!hasLoadedDisclaimer) {
    agreeButton.disabled = true;
    agreeButton.setAttribute('aria-disabled', 'true');
    return;
  }
  const distanceFromBottom =
    contentElement.scrollHeight - contentElement.scrollTop - contentElement.clientHeight;
  const isScrollable = contentElement.scrollHeight > contentElement.clientHeight + 1;
  if (!isScrollable || distanceFromBottom <= 8) {
    agreeButton.disabled = false;
    agreeButton.removeAttribute('aria-disabled');
  } else {
    agreeButton.disabled = true;
    agreeButton.setAttribute('aria-disabled', 'true');
  }
}

function handleDisagree(event) {
  event.preventDefault();
  if (!leaveLink) return;
  leaveLink.hidden = false;
  leaveLink.removeAttribute('aria-hidden');
  leaveLink.tabIndex = 0;
  leaveLink.focus();
}

function closeDisclaimer() {
  if (!isOpen) return;
  modalManager.close();
  isOpen = false;
}

function handleAgree(event) {
  event.preventDefault();
  if (!agreeButton || agreeButton.disabled) {
    return;
  }
  closeDisclaimer();
}

function buildDisclaimerModal() {
  if (modalElement) {
    return modalElement;
  }

  modalElement = document.createElement('div');
  modalElement.id = 'disclaimer-modal';
  modalElement.className = 'modal-overlay disclaimer-overlay';
  modalElement.setAttribute('aria-labelledby', 'disclaimer-title');
  modalElement.setAttribute('aria-describedby', 'disclaimer-body');

  const card = document.createElement('div');
  card.className = 'modal-card disclaimer-card';
  card.setAttribute('role', 'document');

  const header = document.createElement('header');
  header.className = 'modal-header disclaimer-header';

  titleElement = document.createElement('h2');
  titleElement.id = 'disclaimer-title';
  titleElement.tabIndex = -1;
  titleElement.dataset.i18n = 'disclaimer.title';
  header.appendChild(titleElement);

  contentElement = document.createElement('div');
  contentElement.id = 'disclaimer-body';
  contentElement.className = 'modal-body disclaimer-content';
  contentElement.tabIndex = 0;
  contentElement.innerHTML = `<p>${translate('disclaimer.loading')}</p>`;
  contentElement.dataset.status = 'loading';

  const actions = document.createElement('div');
  actions.className = 'modal-actions disclaimer-actions';

  disagreeButton = document.createElement('button');
  disagreeButton.type = 'button';
  disagreeButton.id = 'btn-disagree';
  disagreeButton.dataset.i18n = 'disclaimer.disagree';

  leaveLink = document.createElement('a');
  leaveLink.id = 'disclaimer-leave';
  leaveLink.className = 'disclaimer-leave';
  leaveLink.href = 'about:blank';
  leaveLink.hidden = true;
  leaveLink.setAttribute('aria-hidden', 'true');
  leaveLink.tabIndex = -1;
  leaveLink.dataset.i18n = 'disclaimer.leave';

  agreeButton = document.createElement('button');
  agreeButton.type = 'button';
  agreeButton.id = 'btn-agree';
  agreeButton.disabled = true;
  agreeButton.setAttribute('aria-disabled', 'true');
  agreeButton.dataset.i18n = 'disclaimer.agree';

  actions.append(disagreeButton, leaveLink, agreeButton);

  card.append(header, contentElement, actions);
  modalElement.appendChild(card);

  contentElement.addEventListener('scroll', handleContentScroll);
  disagreeButton.addEventListener('click', handleDisagree);
  agreeButton.addEventListener('click', handleAgree);

  applyTranslations(modalElement);

  onLanguageChange(() => {
    if (modalElement) {
      applyTranslations(modalElement);
      if (contentElement) {
        if (contentElement.dataset.status === 'loading') {
          contentElement.innerHTML = `<p>${translate('disclaimer.loading')}</p>`;
        } else if (contentElement.dataset.status === 'error') {
          contentElement.innerHTML = `<p>${translate('disclaimer.loadError')}</p>`;
        }
      }
    }
  });

  return modalElement;
}

function openDisclaimer() {
  const modal = buildDisclaimerModal();

  if (isOpen) {
    if (titleElement) {
      titleElement.focus({ preventScroll: true });
    }
    return;
  }

  leaveLink.hidden = true;
  leaveLink.setAttribute('aria-hidden', 'true');
  leaveLink.tabIndex = -1;

  agreeButton.disabled = true;
  agreeButton.setAttribute('aria-disabled', 'true');

  if (contentElement) {
    contentElement.scrollTop = 0;
  }

  modalManager.open(modal, {
    escToClose: false,
    restoreFocusTo: document.getElementById('view-root') || document.body,
  });

  isOpen = true;

  if (titleElement) {
    titleElement.focus({ preventScroll: true });
  }

  handleContentScroll();
}

function loadDisclaimerText() {
  if (!contentElement || hasLoadedDisclaimer) return;
  fetch('./data/disclaimer.txt')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to load disclaimer');
      }
      return response.text();
    })
    .then((text) => {
      contentElement.innerHTML = formatDisclaimerText(text);
      contentElement.scrollTop = 0;
      contentElement.dataset.status = 'loaded';
      hasLoadedDisclaimer = true;
      handleContentScroll();
    })
    .catch(() => {
      contentElement.innerHTML = `<p>${translate('disclaimer.loadError')}</p>`;
      contentElement.scrollTop = 0;
      contentElement.dataset.status = 'error';
      hasLoadedDisclaimer = true;
      handleContentScroll();
    });
}

export function showDisclaimerOnLoad() {
  openDisclaimer();
  loadDisclaimerText();
}
