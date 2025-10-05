/* Header menu hardening: layering, overlay, inert background, focus trap, Esc/overlay close, ARIA updates */
(function(){
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('site-menu');
  const overlay = document.getElementById('ui-overlay');
  const main = document.getElementById('main');
  const footer = document.getElementById('site-footer');

  // Focus management helpers
  const FOCUSABLE = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let lastActive = null;

  function setInert(el, on) {
    if (!el) return;
    if (on) {
      el.setAttribute('inert', '');
      el.setAttribute('aria-hidden', 'true');
      // Disable tabbables fallback
      el.querySelectorAll(FOCUSABLE).forEach(n => { n.setAttribute('tabindex','-1'); });
    } else {
      el.removeAttribute('inert');
      el.removeAttribute('aria-hidden');
      el.querySelectorAll('[tabindex="-1"]').forEach(n => { n.removeAttribute('tabindex'); });
    }
  }

  function lockBody(on){ document.body.classList.toggle('is-locked', on); }

  function trapFocus(container, e){
    const nodes = Array.from(container.querySelectorAll(FOCUSABLE)).filter(n => !n.hasAttribute('disabled'));
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }

  function openMenu(){
    if (!menu || !overlay) return;
    lastActive = document.activeElement;
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    overlay.setAttribute('aria-hidden','false');
    lockBody(true);
    setInert(main, true);
    setInert(footer, true);
    // Focus first link
    const first = menu.querySelector(FOCUSABLE);
    if (first) first.focus();
    document.addEventListener('keydown', onKey);
  }

  function closeMenu(){
    if (!menu || !overlay) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    overlay.setAttribute('aria-hidden','true');
    lockBody(false);
    setInert(main, false);
    setInert(footer, false);
    document.removeEventListener('keydown', onKey);
    if (lastActive) lastActive.focus();
  }

  function onKey(e){
    if (e.key === 'Escape') return closeMenu();
    if (e.key === 'Tab') trapFocus(menu, e);
  }

  if (toggle && menu && overlay){
    toggle.addEventListener('click', ()=>{ menu.hidden ? openMenu() : closeMenu(); });
    overlay.addEventListener('click', closeMenu);
  }
})();
