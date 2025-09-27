const focusableSelector = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';

let overlay;
let content;
let agreeButton;
let disagreeButton;
let leaveLink;
let titleNode;
let lastFocusedElement = null;
let isOpen = false;
let hasInitialized = false;
let hasLoadedDisclaimer = false;

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
    return '<p>No disclaimer text available.</p>';
  }
  return trimmed
    .split(/\n\s*\n/g)
    .map((paragraph) => `<p>${escapeHTML(paragraph.trim())}</p>`)
    .join('');
}

function setBodyScrollLocked(locked) {
  document.body.classList.toggle('no-scroll', locked);
}

function setAppInert(isInert) {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;
  if (isInert) {
    appRoot.setAttribute('aria-hidden', 'true');
    if ('inert' in appRoot) {
      appRoot.inert = true;
    } else {
      appRoot.setAttribute('inert', '');
    }
  } else {
    appRoot.removeAttribute('aria-hidden');
    if ('inert' in appRoot) {
      appRoot.inert = false;
    } else {
      appRoot.removeAttribute('inert');
    }
  }
}

function getFocusableElements() {
  if (!overlay) return [];
  return Array.from(overlay.querySelectorAll(focusableSelector)).filter((element) => {
    if (element.disabled) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.hidden) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function handleKeydown(event) {
  if (!isOpen) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

  const focusable = getFocusableElements();
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleContentScroll() {
  if (!content || !agreeButton) return;
  if (!hasLoadedDisclaimer) {
    agreeButton.disabled = true;
    agreeButton.setAttribute('aria-disabled', 'true');
    return;
  }
  const distanceFromBottom = content.scrollHeight - content.scrollTop - content.clientHeight;
  const isScrollable = content.scrollHeight > content.clientHeight + 1;
  if (!isScrollable || distanceFromBottom <= 8) {
    agreeButton.disabled = false;
    agreeButton.removeAttribute('aria-disabled');
  } else {
    agreeButton.disabled = true;
    agreeButton.setAttribute('aria-disabled', 'true');
  }
}

function openOverlay() {
  if (!overlay) return;
  if (isOpen) return;

  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  overlay.hidden = false;
  isOpen = true;
  setBodyScrollLocked(true);
  setAppInert(true);
  document.addEventListener('keydown', handleKeydown, true);

  if (agreeButton) {
    agreeButton.disabled = true;
    agreeButton.setAttribute('aria-disabled', 'true');
  }

  if (content) {
    content.scrollTop = 0;
  }

  requestAnimationFrame(() => {
    if (titleNode) {
      titleNode.focus();
    }
  });

  handleContentScroll();
}

function closeOverlay() {
  if (!overlay || !isOpen) return;

  overlay.hidden = true;
  isOpen = false;
  setBodyScrollLocked(false);
  setAppInert(false);
  document.removeEventListener('keydown', handleKeydown, true);

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

function loadDisclaimerText() {
  if (!content) return;
  fetch('./data/disclaimer.txt')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to load disclaimer');
      }
      return response.text();
    })
    .then((text) => {
      content.innerHTML = formatDisclaimerText(text);
      content.scrollTop = 0;
      hasLoadedDisclaimer = true;
      handleContentScroll();
    })
    .catch(() => {
      content.innerHTML = '<p>Unable to load the disclaimer text. Please refresh the page.</p>';
      content.scrollTop = 0;
      hasLoadedDisclaimer = true;
      handleContentScroll();
    });
}

function handleDisagree(event) {
  event.preventDefault();
  if (!leaveLink) return;
  leaveLink.hidden = false;
  leaveLink.removeAttribute('aria-hidden');
  leaveLink.setAttribute('tabindex', '0');
  leaveLink.focus();
}

function handleAgree(event) {
  event.preventDefault();
  if (agreeButton.disabled) {
    return;
  }
  closeOverlay();
}

function setupElements() {
  overlay = document.getElementById('disclaimer-overlay');
  if (!overlay) return false;
  content = document.getElementById('disclaimer-content');
  agreeButton = document.getElementById('btn-agree');
  disagreeButton = document.getElementById('btn-disagree');
  leaveLink = document.getElementById('disclaimer-leave');
  titleNode = document.getElementById('disclaimer-title');
  if (leaveLink) {
    leaveLink.setAttribute('aria-hidden', 'true');
  }
  if (agreeButton) {
    agreeButton.disabled = true;
    agreeButton.setAttribute('aria-disabled', 'true');
  }
  return Boolean(content && agreeButton && disagreeButton && titleNode);
}

function setupEventHandlers() {
  if (!content || !agreeButton || !disagreeButton) return;
  content.addEventListener('scroll', handleContentScroll);
  agreeButton.addEventListener('click', handleAgree);
  disagreeButton.addEventListener('click', handleDisagree);
}

export function showDisclaimerOnLoad() {
  if (hasInitialized) {
    openOverlay();
    return;
  }

  if (!setupElements()) {
    return;
  }

  hasInitialized = true;
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  loadDisclaimerText();
  setupEventHandlers();
  openOverlay();
}
