import { createRouter, handleEthicsRoute } from './router.js';
import { initTooltips } from './utils/tooltip.js';
import { showDisclaimerOnLoad } from './disclaimer.js';
import {
  initI18n,
  setLanguage,
  getCurrentLanguage,
  translate,
  applyTranslations,
  onLanguageChange,
} from './i18n.js';
import { showToast } from './components.js';
import { initGuidesPage } from './pages/guides.js';

const STORAGE_KEYS = {
  language: 'sra:language',
  reducedMotion: 'sra_rm',
};

const views = {
  home: document.getElementById('view-home'),
  guides: document.getElementById('view-guides'),
  ethics: document.getElementById('view-ethics'),
  about: document.getElementById('view-about'),
  settings: document.getElementById('view-settings'),
};

const viewRoot = document.getElementById('view-root');
const offlineBanner = document.getElementById('offline-banner');
const toastRoot = document.getElementById('toast-root');
const navLinks = Array.from(document.querySelectorAll('[data-nav]'));
const dockItems = Array.from(document.querySelectorAll('.dock-item'));
const languageSelect = document.getElementById('language-select');
const reducedMotionToggle = document.getElementById('reduced-motion-toggle');
const installButton = document.getElementById('install-button');
const installHint = document.getElementById('install-hint');
const offlineIndicator = document.getElementById('offline-indicator');
const offlineStatusLabel = document.getElementById('offline-status-label');

const html = document.documentElement;
const storedLanguage = localStorage.getItem(STORAGE_KEYS.language) || 'en';
const storedReducedMotion = localStorage.getItem(STORAGE_KEYS.reducedMotion);
const motionQuery = typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;
const prefersReducedMotion = storedReducedMotion
  ? storedReducedMotion === 'on'
  : Boolean(motionQuery?.matches);

let router = null;
let deferredPrompt = null;
let guidesController = null;
let unsubscribeLanguage = null;

function setReducedMotionPreference(enabled) {
  html.dataset.rm = enabled ? 'on' : 'off';
  localStorage.setItem(STORAGE_KEYS.reducedMotion, enabled ? 'on' : 'off');
}

function applyReducedMotionUI() {
  const enabled = html.dataset.rm === 'on';
  reducedMotionToggle.checked = enabled;
  if (enabled) {
    html.style.scrollBehavior = 'auto';
  } else {
    html.style.scrollBehavior = 'smooth';
  }
}

function updateOfflineStatus() {
  const online = navigator.onLine;
  offlineBanner.textContent = online ? '' : translate('app.offline');
  offlineBanner.setAttribute('aria-hidden', online ? 'true' : 'false');
  const statusText = translate('settings.offlineStatus', {
    status: online ? translate('settings.statusOnline') : translate('settings.statusOffline'),
  });
  offlineIndicator.textContent = statusText;
  offlineStatusLabel.textContent = translate('settings.offlineStatus', {
    status: online ? translate('settings.statusOnline') : translate('settings.statusOffline'),
  });
}

function setActiveView(path) {
  Object.values(views).forEach((view) => view?.classList.remove('active'));
  if (path.startsWith('/guides')) {
    views.guides?.classList.add('active');
  } else if (path.startsWith('/ethics')) {
    views.ethics?.classList.add('active');
  } else if (path.startsWith('/about')) {
    views.about?.classList.add('active');
  } else if (path.startsWith('/settings')) {
    views.settings?.classList.add('active');
  } else {
    views.home?.classList.add('active');
  }
  requestAnimationFrame(() => {
    viewRoot?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: html.dataset.rm === 'on' ? 'auto' : 'smooth' });
  });
}

function updateNavState(path) {
  navLinks.forEach((link) => {
    const target = link.dataset.nav || '/';
    link.classList.toggle('active', path === target || path.startsWith(`${target}/`));
  });
  dockItems.forEach((item) => {
    const target = item.dataset.dock || '/';
    item.classList.toggle('active', path === target || path.startsWith(`${target}/`));
  });
}

function bindNavigation() {
  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = link.dataset.nav || '/';
      router.navigate(target);
    });
  });
}

function initializeGuides(routerInstance) {
  const controls = document.getElementById('guides-controls');
  const cards = document.getElementById('guides-grid');
  const resultCount = document.getElementById('guides-result-count');
  const emptyState = document.getElementById('guides-empty');
  const filterContainer = document.getElementById('guide-filters');
  const resumeButton = document.getElementById('resume-guide');
  guidesController = initGuidesPage({
    router: routerInstance,
    controls,
    cards,
    resultCount,
    emptyState,
    filterContainer,
    resumeButton,
    toastRoot,
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('./sw.js')
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast(toastRoot, translate('app.updateReady'));
          }
        });
      });
    })
    .catch((error) => console.error('SW registration failed', error));

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'updateavailable') {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      const message = document.createElement('p');
      message.textContent = translate('app.updateReady');
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'button';
      action.textContent = translate('app.reload');
      action.addEventListener('click', () => {
        navigator.serviceWorker.getRegistration().then((registration) => {
          registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        });
      });
      toast.append(message, action);
      toastRoot.appendChild(toast);
    }
  });
}

function handleLanguageChange() {
  languageSelect.addEventListener('change', async () => {
    const nextLanguage = languageSelect.value;
    try {
      await setLanguage(nextLanguage);
      localStorage.setItem(STORAGE_KEYS.language, nextLanguage);
      showToast(toastRoot, translate('settings.toastLanguage', { language: languageSelect.options[languageSelect.selectedIndex].textContent }));
    } catch (error) {
      console.error('Failed to switch language', error);
      showToast(toastRoot, translate('settings.toastLanguage', { language: translate('settings.languageEnglish') }));
    }
  });
}

function handleReducedMotionToggle() {
  reducedMotionToggle.addEventListener('change', () => {
    const enabled = reducedMotionToggle.checked;
    setReducedMotionPreference(enabled);
    applyReducedMotionUI();
    showToast(toastRoot, translate(enabled ? 'settings.toastMotionOn' : 'settings.toastMotionOff'));
  });
}

function handleInstallPrompt() {
  installButton.disabled = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.disabled = false;
    installHint.textContent = translate('settings.installReady');
  });

  window.addEventListener('appinstalled', () => {
    installHint.textContent = translate('settings.installComplete');
    showToast(toastRoot, translate('settings.installComplete'));
  });

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      showToast(toastRoot, translate('settings.installComplete'));
    }
    deferredPrompt = null;
    installButton.disabled = true;
  });
}

function watchConnectivity() {
  window.addEventListener('online', updateOfflineStatus);
  window.addEventListener('offline', updateOfflineStatus);
  updateOfflineStatus();
}

function setupRouter() {
  router.addRoute('/', async () => {
    setActiveView('/');
    updateNavState('/');
  });
  router.addRoute('/guides', async () => {
    setActiveView('/guides');
    updateNavState('/guides');
    await guidesController?.show();
  });
  router.addRoute('/ethics', async () => {
    setActiveView('/ethics');
    updateNavState('/ethics');
    await handleEthicsRoute(document.getElementById('ethics-content'));
  });
  router.addRoute('/about', async () => {
    setActiveView('/about');
    updateNavState('/about');
  });
  router.addRoute('/settings', async () => {
    setActiveView('/settings');
    updateNavState('/settings');
  });
  router.setNotFound(() => {
    router.navigate('/', { replace: true });
  });
  router.start();
}

async function bootstrap() {
  html.dataset.rm = prefersReducedMotion ? 'on' : 'off';
  applyReducedMotionUI();

  initTooltips();

  await initI18n(storedLanguage);
  languageSelect.value = getCurrentLanguage();
  applyTranslations(document.body);
  if (!unsubscribeLanguage) {
    unsubscribeLanguage = onLanguageChange(() => {
      applyTranslations(document.body);
      updateOfflineStatus();
    });
  }

  router = createRouter();
  initializeGuides(router);
  setupRouter();
  bindNavigation();
  handleLanguageChange();
  handleReducedMotionToggle();
  handleInstallPrompt();
  watchConnectivity();
  registerServiceWorker();
  showDisclaimerOnLoad();
}

document.addEventListener('DOMContentLoaded', async () => {
  await bootstrap();
});
