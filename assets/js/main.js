(function(){
  const btn = document.querySelector('.menu-toggle');
  const menu = document.getElementById('site-menu');
  if (!btn || !menu) return;
  const container = btn.closest('.menu-container') || btn.parentElement;
  const outsideClick = (event) => {
    if (!container || container.contains(event.target)) return;
    toggle(false);
  };
  const manageOutside = (listen) => {
    const method = listen ? 'addEventListener' : 'removeEventListener';
    document[method]('pointerdown', outsideClick);
  };
  const toggle = (open) => {
    const isOpen = open ?? menu.hasAttribute('hidden');
    if (isOpen) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', String(isOpen));
    manageOutside(isOpen);
    if (isOpen) menu.querySelector('a')?.focus();
  };
  btn.addEventListener('click', () => toggle());
  btn.addEventListener('keydown', (e)=>{ if(e.key==='ArrowDown' && btn.getAttribute('aria-expanded')==='false'){ e.preventDefault(); toggle(true);} });
  menu.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ toggle(false); btn.focus(); } });
  menu.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=> toggle(false)));
  // Mark current nav item
  const normalized = location.pathname.replace(/\/index\.html$/, '/');
  let current = null;
  const hash = location.hash;
  if (hash === '#self-audit') current = 'self-audit';
  else if (hash === '#tools-methods') current = 'tools';
  if (!current) {
    if (normalized === '/PRIVACY/' || normalized === '/PRIVACY') current = 'home';
    else if (normalized === '/PRIVACY/self-audit/' || normalized === '/PRIVACY/self-audit') current = 'self-audit';
    else if (normalized === '/PRIVACY/tools-and-methods/' || normalized === '/PRIVACY/tools-and-methods') current = 'tools';
    else if (normalized === '/PRIVACY/platform.html') current = 'platform';
    else if (normalized.startsWith('/PRIVACY/platforms/')) current = 'platform';
    else if (normalized === '/PRIVACY/ethics.html') current = 'ethics';
    else if (normalized === '/PRIVACY/why.html') current = 'why';
    else if (normalized === '/PRIVACY/about/' || normalized === '/PRIVACY/about') current = 'about';
    else if (normalized === '/PRIVACY/disclaimer/' || normalized === '/PRIVACY/disclaimer') current = 'disclaimer';
  }
  if (current) document.querySelector(`[data-nav="${current}"]`)?.setAttribute('aria-current','page');
})();
