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

  const overlayController = (function(){
    if (typeof document === 'undefined') {
      return {
        overlay: null,
        show(){},
        hide(){},
        lock(){},
        unlock(){},
        inert(){},
        isActive(){ return false; }
      };
    }
    const overlayId = 'ui-overlay';
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(overlay, document.body.firstChild || null);
    }
    const owners = new Set();
    const locks = new Set();
    const inertRegistry = new Map();

    function syncOverlay() {
      if (!overlay) return;
      overlay.setAttribute('aria-hidden', owners.size ? 'false' : 'true');
    }

    function show(owner) {
      if (!overlay) return;
      owners.add(owner);
      syncOverlay();
    }

    function hide(owner) {
      if (!overlay) return;
      owners.delete(owner);
      syncOverlay();
    }

    function lock(owner) {
      if (!document.body) return;
      locks.add(owner);
      document.body.classList.add('is-locked');
    }

    function unlock(owner) {
      if (!document.body) return;
      locks.delete(owner);
      if (!locks.size) {
        document.body.classList.remove('is-locked');
      }
    }

    function inert(element, owner, enable) {
      if (!element) return;
      let record = inertRegistry.get(element);
      if (!record) {
        record = new Set();
        inertRegistry.set(element, record);
      }
      if (enable) {
        record.add(owner);
        element.setAttribute('inert', '');
        return;
      }
      record.delete(owner);
      if (!record.size) {
        element.removeAttribute('inert');
        inertRegistry.delete(element);
      }
    }

    return {
      overlay,
      show,
      hide,
      lock,
      unlock,
      inert,
      isActive(){ return owners.size > 0; }
    };
  })();

  if (typeof window !== 'undefined') {
    window.__UIOverlay = overlayController;
  }

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const prefix = computeBasePrefix();
      const workerUrl = `${prefix}sw.js`;
      navigator.serviceWorker.register(workerUrl).catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    });
  }

  const toggle = typeof document !== 'undefined' ? document.querySelector('.menu-toggle') : null;
  const menu = typeof document !== 'undefined' ? document.getElementById('site-menu') : null;
  if (!toggle || !menu) {
    return;
  }

  const main = document.getElementById('main');
  const footer = document.getElementById('site-footer') || document.querySelector('footer');
  const header = document.querySelector('header');
  let menuOpen = false;

  function setInertState(owner, state) {
    overlayController.inert(main, owner, state);
    overlayController.inert(footer, owner, state);
    overlayController.inert(header, owner, state);
  }

  function openMenu() {
    if (menuOpen) return;
    menu.hidden = false;
    menuOpen = true;
    toggle.setAttribute('aria-expanded', 'true');
    overlayController.show('menu');
    overlayController.lock('menu');
    setInertState('menu', true);
    const firstLink = menu.querySelector('a');
    if (firstLink) {
      firstLink.focus();
    }
  }

  function closeMenu() {
    if (!menuOpen) return;
    menu.hidden = true;
    menuOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    overlayController.hide('menu');
    overlayController.unlock('menu');
    setInertState('menu', false);
    if (!header || !header.hasAttribute('inert')) {
      toggle.focus();
    }
  }

  toggle.addEventListener('click', () => {
    if (menuOpen || !menu.hidden) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  toggle.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && !menuOpen) {
      event.preventDefault();
      openMenu();
    }
  });

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeMenu();
    }
  });

  menu.querySelectorAll('a').forEach((anchor) => {
    anchor.addEventListener('click', () => closeMenu());
  });

  if (overlayController.overlay) {
    overlayController.overlay.addEventListener('click', () => {
      if (menuOpen) {
        closeMenu();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuOpen) {
      closeMenu();
    }
  });

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
    else if (normalized === '/tools-methods.html') current = 'tools';
    else if (normalized === '/platform.html') current = 'platform';
    else if (normalized.startsWith('/platforms/')) current = 'platform';
    else if (normalized === '/ethics.html') current = 'ethics';
    else if (normalized === '/why.html') current = 'why';
    else if (normalized === '/about/' || normalized === '/about') current = 'about';
    else if (normalized === '/contact/' || normalized === '/contact') current = 'contact';
    else if (normalized === '/disclaimer/' || normalized === '/disclaimer') current = 'disclaimer';
  }
  if (current) document.querySelectorAll(`[data-nav="${current}"]`).forEach((navItem) => navItem.setAttribute('aria-current', 'page'));
})();
