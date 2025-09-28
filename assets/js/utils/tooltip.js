let tooltipEl = null;
let currentAnchor = null;
let hideTimer = null;

function prefersReducedMotion() {
  return document.documentElement?.dataset?.rm === 'on';
}

function ensureTooltipEl() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'sra-tooltip';
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.setAttribute('aria-hidden', 'true');
  tooltipEl.style.position = 'fixed';
  tooltipEl.style.pointerEvents = 'none';
  tooltipEl.style.zIndex = '9999';
  tooltipEl.style.maxWidth = 'min(92vw, 320px)';
  tooltipEl.style.padding = '8px 12px';
  tooltipEl.style.borderRadius = '12px';
  tooltipEl.style.background = 'rgba(6, 20, 32, 0.92)';
  tooltipEl.style.color = '#d7faff';
  tooltipEl.style.border = '1px solid rgba(0, 255, 255, 0.35)';
  tooltipEl.style.backdropFilter = 'blur(12px)';
  tooltipEl.style.webkitBackdropFilter = 'blur(12px)';
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function computePosition(anchor, placement) {
  const rect = anchor.getBoundingClientRect();
  const tooltip = ensureTooltipEl();
  const { width: tw, height: th } = tooltip.getBoundingClientRect();
  const gap = 10;
  let top = rect.top - th - gap;
  let left = rect.left + rect.width / 2 - tw / 2;

  switch (placement) {
    case 'bottom':
      top = rect.bottom + gap;
      break;
    case 'left':
      left = rect.left - tw - gap;
      top = rect.top + rect.height / 2 - th / 2;
      break;
    case 'right':
      left = rect.right + gap;
      top = rect.top + rect.height / 2 - th / 2;
      break;
    default:
      if (top < 0) {
        top = rect.bottom + gap;
      }
      break;
  }

  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  top = Math.max(8, Math.min(top, vh - th - 8));
  left = Math.max(8, Math.min(left, vw - tw - 8));
  return { top, left };
}

export function showTooltip(anchor, text, { placement = 'auto', duration = 0 } = {}) {
  if (!anchor || !text) return;
  clearTimeout(hideTimer);
  const tooltip = ensureTooltipEl();
  tooltip.textContent = text;
  tooltip.setAttribute('aria-hidden', 'false');

  if (!anchor.id) {
    anchor.id = `tt-${Math.random().toString(36).slice(2, 8)}`;
  }
  tooltip.id = `${anchor.id}-tooltip`;
  anchor.setAttribute('aria-describedby', tooltip.id);

  const reduceMotion = prefersReducedMotion();
  tooltip.style.transition = reduceMotion ? 'none' : 'opacity 160ms ease, transform 160ms ease';
  tooltip.style.opacity = reduceMotion ? '1' : '0';
  tooltip.style.transform = reduceMotion ? 'scale(1)' : 'scale(0.98)';

  const { top, left } = computePosition(anchor, placement);
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;

  if (!reduceMotion) {
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'scale(1)';
    });
  }

  currentAnchor = anchor;
  if (duration > 0) {
    hideTimer = window.setTimeout(() => hideTooltip(), duration);
  }
}

export function hideTooltip() {
  clearTimeout(hideTimer);
  const tooltip = ensureTooltipEl();
  if (currentAnchor) {
    currentAnchor.removeAttribute('aria-describedby');
  }
  if (prefersReducedMotion()) {
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'scale(1)';
    tooltip.textContent = '';
    tooltip.setAttribute('aria-hidden', 'true');
    currentAnchor = null;
    return;
  }
  tooltip.style.transition = 'opacity 140ms ease, transform 140ms ease';
  tooltip.style.opacity = '0';
  tooltip.style.transform = 'scale(0.96)';
  window.setTimeout(() => {
    tooltip.textContent = '';
    tooltip.setAttribute('aria-hidden', 'true');
  }, 160);
  currentAnchor = null;
}

export function initTooltips({ selector = '[data-tooltip]' } = {}) {
  document.addEventListener(
    'pointerenter',
    (event) => {
      const anchor = event.target.closest(selector);
      if (!anchor) return;
      showTooltip(anchor, anchor.getAttribute('data-tooltip') || anchor.getAttribute('aria-label'));
    },
    true,
  );

  document.addEventListener(
    'pointerleave',
    (event) => {
      if (currentAnchor && event.target.closest(selector) === currentAnchor) {
        hideTooltip();
      }
    },
    true,
  );

  document.addEventListener('focusin', (event) => {
    const anchor = event.target.closest(selector);
    if (!anchor) return;
    showTooltip(anchor, anchor.getAttribute('data-tooltip') || anchor.getAttribute('aria-label'));
  });

  document.addEventListener('focusout', (event) => {
    if (currentAnchor && event.target.closest(selector) === currentAnchor) {
      hideTooltip();
    }
  });

  window.addEventListener('scroll', () => {
    if (!currentAnchor) return;
    const tooltip = ensureTooltipEl();
    if (tooltip.getAttribute('aria-hidden') === 'true') return;
    const { top, left } = computePosition(currentAnchor, 'auto');
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }, true);

  window.addEventListener('resize', () => {
    if (!currentAnchor) return;
    const tooltip = ensureTooltipEl();
    if (tooltip.getAttribute('aria-hidden') === 'true') return;
    const { top, left } = computePosition(currentAnchor, 'auto');
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  });
}
