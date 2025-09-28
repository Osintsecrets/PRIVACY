export let tooltipEl = null;
let currentAnchor = null;
let hideTimer = null;

function ensureTooltipEl() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'sra-tooltip';
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.setAttribute('aria-hidden', 'true');
  tooltipEl.style.position = 'fixed';
  tooltipEl.style.pointerEvents = 'none';
  tooltipEl.style.zIndex = '9999';
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function getPlacementRect(anchor, placement, gap = 8) {
  const r = anchor.getBoundingClientRect();
  const tt = ensureTooltipEl();
  const { width: tw, height: th } = tt.getBoundingClientRect();

  let top = 0, left = 0;
  switch (placement) {
    case 'top':
      top = r.top - th - gap; left = r.left + (r.width - tw) / 2; break;
    case 'bottom':
      top = r.bottom + gap; left = r.left + (r.width - tw) / 2; break;
    case 'left':
      top = r.top + (r.height - th) / 2; left = r.left - tw - gap; break;
    case 'right':
      top = r.top + (r.height - th) / 2; left = r.right + gap; break;
    default:
      top = r.top - th - gap;
      left = r.left + (r.width - tw) / 2;
      if (top < 0) top = r.bottom + gap;
      break;
  }

  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  left = Math.max(8, Math.min(left, vw - tw - 8));
  top = Math.max(8, Math.min(top, vh - th - 8));
  return { top, left };
}

export function showTooltip(anchor, text, opts = {}) {
  const { placement = 'auto', duration = 0 } = opts;
  if (!anchor || !text) return;

  clearTimeout(hideTimer);
  const tt = ensureTooltipEl();
  tt.textContent = text;
  tt.setAttribute('aria-hidden', 'false');

  if (!anchor.id) anchor.id = `sra-${Math.random().toString(36).slice(2, 8)}`;
  tt.id = `tt-${anchor.id}`;
  anchor.setAttribute('aria-describedby', tt.id);

  tt.style.opacity = '0';
  tt.style.transform = 'scale(0.98)';
  tt.style.transition = 'opacity 120ms ease, transform 120ms ease';
  tt.style.maxWidth = 'min(90vw, 320px)';
  tt.style.padding = '8px 10px';
  tt.style.borderRadius = '10px';
  tt.style.backdropFilter = 'blur(6px)';
  tt.style.webkitBackdropFilter = 'blur(6px)';

  tt.offsetHeight;
  const { top, left } = getPlacementRect(anchor, placement);
  tt.style.top = `${top}px`;
  tt.style.left = `${left}px`;
  requestAnimationFrame(() => {
    tt.style.opacity = '1';
    tt.style.transform = 'scale(1)';
  });

  currentAnchor = anchor;
  if (duration > 0) hideTimer = setTimeout(() => hideTooltip(), duration);
}

export function hideTooltip() {
  clearTimeout(hideTimer);
  const tt = ensureTooltipEl();
  if (currentAnchor) currentAnchor.removeAttribute('aria-describedby');
  tt.setAttribute('aria-hidden', 'true');
  tt.style.opacity = '0';
  tt.style.transform = 'scale(0.98)';
  setTimeout(() => { tt.textContent = ''; }, 150);
  currentAnchor = null;
}

export function initTooltips({ selector = '[data-tooltip]' } = {}) {
  document.addEventListener('pointerenter', (e) => {
    const t = e.target.closest(selector);
    if (t) showTooltip(t, t.getAttribute('data-tooltip'));
  }, true);

  document.addEventListener('pointerleave', (e) => {
    if (e.target.closest(selector) === currentAnchor) hideTooltip();
  }, true);

  document.addEventListener('focusin', (e) => {
    const t = e.target.closest(selector);
    if (t) showTooltip(t, t.getAttribute('data-tooltip'));
  });

  document.addEventListener('focusout', (e) => {
    if (e.target.closest(selector) === currentAnchor) hideTooltip();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTooltip();
  });

  const reposition = () => {
    if (!currentAnchor) return;
    const tt = ensureTooltipEl();
    if (tt.getAttribute('aria-hidden') === 'true') return;
    const { top, left } = getPlacementRect(currentAnchor, 'auto');
    tt.style.top = `${top}px`;
    tt.style.left = `${left}px`;
  };
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
}
