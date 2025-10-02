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
  const map = {
    '/PRIVACY/': 'home',
    '/PRIVACY/platform.html': 'platform',
    '/PRIVACY/platforms/facebook.html': 'platform',
    '/PRIVACY/platforms/instagram.html': 'platform',
    '/PRIVACY/platforms/x.html': 'platform',
    '/PRIVACY/platforms/tiktok.html': 'platform',
    '/PRIVACY/platforms/whatsapp.html': 'platform',
    '/PRIVACY/platforms/telegram.html': 'platform',
    '/PRIVACY/ethics.html': 'ethics',
    '/PRIVACY/why.html': 'why'
  };
  const key = Object.keys(map).find(p => location.pathname.endsWith(p.replace('/PRIVACY','')) || location.pathname===p);
  const sel = key ? `[data-nav="${map[key]}"]` : null;
  if (sel) document.querySelector(sel)?.setAttribute('aria-current','page');
})();
