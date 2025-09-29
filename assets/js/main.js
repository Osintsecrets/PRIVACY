(function(){
  const btn = document.querySelector('.menu-toggle');
  const menu = document.getElementById('site-menu');
  if (!btn || !menu) return;
  const toggle = (open) => {
    const isOpen = open ?? menu.hasAttribute('hidden');
    if (isOpen) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) menu.querySelector('a')?.focus();
  };
  btn.addEventListener('click', () => toggle());
  btn.addEventListener('keydown', (e)=>{ if(e.key==='ArrowDown' && btn.getAttribute('aria-expanded')==='false'){ e.preventDefault(); toggle(true);} });
  menu.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ toggle(false); btn.focus(); } });
  menu.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=> toggle(false)));
  // Mark current nav item
  const map = { '/PRIVACY/':'home', '/PRIVACY/platform.html':'platform', '/PRIVACY/ethics.html':'ethics', '/PRIVACY/why.html':'why' };
  const key = Object.keys(map).find(p => location.pathname.endsWith(p.replace('/PRIVACY','')) || location.pathname===p);
  const sel = key ? `[data-nav="${map[key]}"]` : null;
  if (sel) document.querySelector(sel)?.setAttribute('aria-current','page');
})();
