(function(){
  function computeBasePrefix(customBase) {
    if (typeof window === 'undefined') return customBase || './';
    if (customBase) return customBase;
    const pathname = window.location.pathname || '';
    const anchor = '/PRIVACY/';
    const anchorIndex = pathname.indexOf(anchor);
    if (anchorIndex === -1) {
      return './';
    }
    const afterAnchor = pathname.slice(anchorIndex + anchor.length);
    if (!afterAnchor) {
      return './';
    }
    const segments = afterAnchor.split('/').filter(Boolean);
    const isDirectory = pathname.endsWith('/');
    const depth = Math.max(0, segments.length - (isDirectory ? 0 : 1));
    if (depth === 0) {
      return './';
    }
    return '../'.repeat(depth);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      if (!('serviceWorker' in navigator)) return;
      const prefix = computeBasePrefix();
      const workerUrl = `${prefix}sw.js`;
      navigator.serviceWorker.register(workerUrl).catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    });
  }

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
  const brand = document.querySelector('.brand');
  let basePath = '/';
  if (brand) {
    try {
      const brandURL = new URL(brand.getAttribute('href') ?? brand.href, location.href);
      basePath = brandURL.pathname;
    } catch (err) {
      basePath = '/';
    }
  }
  basePath = basePath.replace(/index\.html$/, '');
  if (!basePath.endsWith('/')) basePath += '/';

  let normalized = location.pathname.replace(/index\.html$/, '');
  if (normalized === basePath.slice(0, -1)) normalized = '';
  else if (normalized.startsWith(basePath) && basePath !== '/') normalized = normalized.slice(basePath.length);
  else if (basePath === '/' && normalized.startsWith('/')) normalized = normalized.slice(1);
  else if (basePath !== '/' && basePath.length > 1 && normalized.startsWith(basePath.slice(0, -1))) {
    normalized = normalized.slice(basePath.slice(0, -1).length);
  }
  if (!normalized.startsWith('/')) normalized = normalized ? `/${normalized}` : '/';
  let current = null;
  const hash = location.hash;
  if (hash === '#tools-methods') current = 'tools';
  if (!current) {
    if (normalized === '/' || normalized === '') current = 'home';
    else if (normalized === '/tools-and-methods/' || normalized === '/tools-and-methods') current = 'tools';
    else if (normalized === '/platform.html') current = 'platform';
    else if (normalized.startsWith('/platforms/')) current = 'platform';
    else if (normalized === '/ethics.html') current = 'ethics';
    else if (normalized === '/why.html') current = 'why';
    else if (normalized === '/about/' || normalized === '/about') current = 'about';
    else if (normalized === '/contact/' || normalized === '/contact') current = 'contact';
    else if (normalized === '/disclaimer/' || normalized === '/disclaimer') current = 'disclaimer';
  }
  if (current) document.querySelector(`[data-nav="${current}"]`)?.setAttribute('aria-current','page');

  let deferredInstallPrompt = null;
  const installTrigger = document.querySelector('[data-install-trigger]');
  const installMessage = document.querySelector('[data-install-message]');

  const setInstallMessage = (text) => {
    if (installMessage) installMessage.textContent = text;
  };

  const setTriggerState = (enabled) => {
    if (!installTrigger) return;
    if (enabled) {
      installTrigger.removeAttribute('disabled');
      installTrigger.setAttribute('aria-disabled', 'false');
    } else {
      installTrigger.setAttribute('disabled', '');
      installTrigger.setAttribute('aria-disabled', 'true');
    }
  };

  setTriggerState(false);

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setTriggerState(true);
    setInstallMessage('Ready to install. Choose “Add to Home Screen” to continue.');
  });

  installTrigger?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      setInstallMessage('Your browser will surface the install option when it becomes available.');
      return;
    }
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setInstallMessage('Installation requested. Confirm the prompt from your browser to finish.');
      } else {
        setInstallMessage('Install dismissed. You can retry from your browser menu when ready.');
      }
    } catch (error) {
      console.error('Install prompt failed:', error);
      setInstallMessage('Something went wrong launching the install prompt. Please try again later.');
    } finally {
      deferredInstallPrompt = null;
      setTriggerState(false);
    }
  });

  window.addEventListener('appinstalled', () => {
    setInstallMessage('Installed! Look for the Social Risk Audit icon on your device.');
    setTriggerState(false);
  });
})();
