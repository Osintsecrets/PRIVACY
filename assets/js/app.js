import { createRouter, handleEthicsRoute, handleManualRoute } from './router.js';
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
import { modalManager } from './utils/modal.js';

const STORAGE_KEYS = {
  language: 'sra:language',
  reducedMotion: 'sra_rm',
  fontScale: 'sra:font-scale',
  contrast: 'sra:contrast',
};

const ROUTE_LABELS = {
  '/': 'nav.home',
  '/guides': 'nav.guides',
  '/manual': 'nav.manual',
  '/ethics': 'nav.ethics',
  '/about': 'nav.about',
  '/settings': 'nav.settings',
};

const html = document.documentElement;
const appShell = document.querySelector('[data-app-shell]');
const viewRoot = document.getElementById('view-root');
const offlineBanner = document.getElementById('offline-banner');
const toastRoot = document.getElementById('toast-root');
const navLinks = Array.from(document.querySelectorAll('[data-nav]'));
const languageSelect = document.getElementById('language-select');
const reducedMotionToggle = document.getElementById('reduced-motion-toggle');
const fontScaleSelect = document.getElementById('font-scale-select');
const contrastToggle = document.getElementById('contrast-toggle');
const installButton = document.getElementById('install-button');
const installHint = document.getElementById('install-hint');
const offlineIndicator = document.getElementById('offline-indicator');
const offlineStatusLabel = document.getElementById('offline-status-label');
const menuToggle = document.getElementById('menu-toggle');
const menuClose = document.getElementById('menu-close');
const menuDrawer = document.getElementById('primary-menu');
const menuOverlay = document.getElementById('menu-overlay');
const breadcrumbList = document.getElementById('breadcrumb-list');
const progressBar = document.getElementById('global-progress-bar');
const progressLabel = document.getElementById('global-progress-label');
const quickAction = document.getElementById('quick-action');

const storedLanguage = localStorage.getItem(STORAGE_KEYS.language) || 'en';
const storedReducedMotion = localStorage.getItem(STORAGE_KEYS.reducedMotion);
const storedFontScale = localStorage.getItem(STORAGE_KEYS.fontScale) || 'standard';
const storedContrast = localStorage.getItem(STORAGE_KEYS.contrast) || 'standard';
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
let lastGuideMeta = null;
let shortcutModal = null;
let swipeStart = null;
let quickActionState = { type: 'search', guide: null };
const offlineQueue = [];

const views = {
  home: document.getElementById('view-home'),
  guides: document.getElementById('view-guides'),
  manual: document.getElementById('view-manual'),
  ethics: document.getElementById('view-ethics'),
  about: document.getElementById('view-about'),
  settings: document.getElementById('view-settings'),
};

function setReducedMotionPreference(enabled) {
  html.dataset.rm = enabled ? 'on' : 'off';
  localStorage.setItem(STORAGE_KEYS.reducedMotion, enabled ? 'on' : 'off');
}

function applyReducedMotionUI() {
  const enabled = html.dataset.rm === 'on';
  reducedMotionToggle.checked = enabled;
  html.style.scrollBehavior = enabled ? 'auto' : 'smooth';
}

function setFontScalePreference(scale) {
  const normalized = ['compact', 'standard', 'comfortable', 'accessible'].includes(scale)
    ? scale
    : 'standard';
  if (normalized === 'standard') {
    html.dataset.font = 'standard';
  } else {
    html.dataset.font = normalized;
  }
  localStorage.setItem(STORAGE_KEYS.fontScale, normalized);
}

function applyFontScaleUI() {
  const current = localStorage.getItem(STORAGE_KEYS.fontScale) || 'standard';
  fontScaleSelect.value = current;
}

function setContrastPreference(mode) {
  const normalized = mode === 'high' ? 'high' : 'standard';
  if (normalized === 'high') {
    html.dataset.contrast = 'high';
  } else {
    delete html.dataset.contrast;
  }
  localStorage.setItem(STORAGE_KEYS.contrast, normalized);
}

function applyContrastUI() {
  const current = localStorage.getItem(STORAGE_KEYS.contrast) || 'standard';
  contrastToggle.checked = current === 'high';
}

function formatStatusText(online) {
  return translate('settings.offlineStatus', {
    status: online ? translate('settings.statusOnline') : translate('settings.statusOffline'),
  });
}

function flushOfflineQueue() {
  if (!navigator.onLine || !offlineQueue.length) return;
  while (offlineQueue.length) {
    const item = offlineQueue.shift();
    if (item?.messageKey) {
      showToast(toastRoot, translate(item.messageKey, item.params || {}));
    }
  }
}

function updateOfflineStatus() {
  const online = navigator.onLine;
  offlineBanner.textContent = online ? '' : translate('app.offline');
  offlineBanner.setAttribute('aria-hidden', online ? 'true' : 'false');
  const statusText = formatStatusText(online);
  offlineIndicator.textContent = statusText;
  offlineStatusLabel.textContent = statusText;
  if (online) {
    flushOfflineQueue();
  }
}

function updateBreadcrumbs(path) {
  if (!breadcrumbList) return;
  breadcrumbList.innerHTML = '';
  const crumbs = [];
  crumbs.push({ path: '/', labelKey: ROUTE_LABELS['/'] });
  if (path !== '/' && path) {
    const segments = path.split('/').filter(Boolean);
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const key = ROUTE_LABELS[currentPath] || ROUTE_LABELS[`/${segment}`] || `nav.${segment}`;
      crumbs.push({ path: index === segments.length - 1 ? null : `#${currentPath}`, labelKey: key });
    });
  }
  crumbs.forEach((crumb, index) => {
    const li = document.createElement('li');
    const label = translate(crumb.labelKey) || crumb.labelKey;
    if (crumb.path) {
      const link = document.createElement('a');
      link.href = crumb.path;
      link.textContent = label;
      li.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.textContent = label;
      li.appendChild(span);
    }
    li.setAttribute('data-index', String(index));
    breadcrumbList.appendChild(li);
  });
}

function updateNavState(path) {
  navLinks.forEach((link) => {
    const target = link.dataset.nav || '/';
    link.classList.toggle('active', path === target || path.startsWith(`${target}/`));
  });
  updateBreadcrumbs(path);
}

function updateGlobalProgress(summary = null) {
  if (!progressBar || !progressLabel) return;
  const metrics = summary || guidesController?.getCompletionSummary?.();
  if (!metrics || !metrics.totalSteps) {
    progressBar.style.width = '0%';
    progressLabel.textContent = translate('guides.progressGlobalEmpty');
    quickActionState = { type: 'search', guide: lastGuideMeta };
    quickAction?.setAttribute('aria-label', translate('app.quickActionSearch'));
    quickAction.textContent = '⌕';
    return;
  }
  const percent = Math.round(metrics.completedSteps / metrics.totalSteps * 100);
  progressBar.style.width = `${percent}%`;
  progressLabel.textContent = translate('guides.progressGlobal', {
    completed: metrics.completedSteps,
    total: metrics.totalSteps,
    percent,
  });
  if (metrics.activeGuide) {
    quickActionState = { type: 'resume', guide: metrics.activeGuide };
    quickAction.textContent = '↺';
    quickAction?.setAttribute(
      'aria-label',
      translate('app.quickActionResume', { guide: metrics.activeGuide.title }),
    );
  } else {
    quickActionState = { type: 'search', guide: lastGuideMeta };
    quickAction.textContent = '⌕';
    quickAction?.setAttribute('aria-label', translate('app.quickActionSearch'));
  }
}

function setActiveView(path) {
  Object.values(views).forEach((view) => view?.classList.remove('active'));
  if (path.startsWith('/guides')) {
    views.guides?.classList.add('active');
  } else if (path.startsWith('/manual')) {
    views.manual?.classList.add('active');
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

function setMenuState(open) {
  if (!menuDrawer || !menuToggle || !menuOverlay) return;
  menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    menuDrawer.hidden = false;
    menuOverlay.hidden = false;
    requestAnimationFrame(() => {
      menuDrawer.classList.add('open');
      menuOverlay.classList.add('active');
    });
    document.body?.classList.add('no-scroll');
    menuDrawer.focus?.();
  } else {
    const finalize = () => {
      menuDrawer.hidden = true;
      menuOverlay.hidden = true;
    };
    menuDrawer.classList.remove('open');
    menuOverlay.classList.remove('active');
    document.body?.classList.remove('no-scroll');
    if (html.dataset.rm === 'on') {
      finalize();
    } else {
      const onTransitionEnd = () => {
        finalize();
        menuDrawer.removeEventListener('transitionend', onTransitionEnd);
      };
      menuDrawer.addEventListener('transitionend', onTransitionEnd);
      setTimeout(onTransitionEnd, 220);
    }
  }
}

function toggleMenu() {
  const isOpen = menuToggle?.getAttribute('aria-expanded') === 'true';
  setMenuState(!isOpen);
}

function closeMenu() {
  setMenuState(false);
}

function bindMenuControls() {
  menuToggle?.addEventListener('click', toggleMenu);
  menuClose?.addEventListener('click', closeMenu);
  menuOverlay?.addEventListener('click', closeMenu);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuToggle?.focus();
    }
  });
}

function bindNavigation() {
  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = link.dataset.nav || '/';
      router.navigate(target);
      closeMenu();
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
      showToast(toastRoot, translate('settings.toastLanguage', {
        language: languageSelect.options[languageSelect.selectedIndex]?.textContent || nextLanguage,
      }));
      updateBreadcrumbs(router.getCurrent()?.path || '/');
      updateGlobalProgress();
    } catch (error) {
      console.error('Failed to switch language', error);
      showToast(toastRoot, translate('settings.toastLanguage', {
        language: translate('settings.languageEnglish'),
      }));
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

function handleFontScaleChange() {
  fontScaleSelect.addEventListener('change', () => {
    const scale = fontScaleSelect.value;
    setFontScalePreference(scale);
    applyFontScaleUI();
    showToast(toastRoot, translate('settings.toastFont', {
      size: translate(`settings.font${scale.charAt(0).toUpperCase()}${scale.slice(1)}`),
    }));
  });
}

function handleContrastToggle() {
  contrastToggle.addEventListener('change', () => {
    const enabled = contrastToggle.checked;
    setContrastPreference(enabled ? 'high' : 'standard');
    applyContrastUI();
    showToast(toastRoot, translate(enabled ? 'settings.toastContrastOn' : 'settings.toastContrastOff'));
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

function buildShortcutModal() {
  if (shortcutModal) return shortcutModal;
  shortcutModal = document.createElement('div');
  shortcutModal.className = 'modal-overlay';
  shortcutModal.id = 'shortcut-modal';

  const card = document.createElement('div');
  card.className = 'modal-card';
  shortcutModal.appendChild(card);

  const header = document.createElement('header');
  header.className = 'modal-header';
  const title = document.createElement('h2');
  title.dataset.i18n = 'app.shortcutsTitle';
  header.appendChild(title);
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'button';
  closeBtn.dataset.i18n = 'app.shortcutsClose';
  closeBtn.addEventListener('click', () => modalManager.close());
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'modal-body';
  const intro = document.createElement('p');
  intro.dataset.i18n = 'app.shortcutsDescription';
  body.appendChild(intro);
  const list = document.createElement('ul');
  list.className = 'card';
  ['openShortcuts', 'focusSearch', 'openGuides', 'resume'].forEach((key) => {
    const item = document.createElement('li');
    item.dataset.i18n = `app.shortcuts.${key}`;
    item.textContent = translate(`app.shortcuts.${key}`);
    list.appendChild(item);
  });
  body.appendChild(list);

  const footer = document.createElement('div');
  footer.className = 'modal-actions';
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'button';
  dismiss.dataset.i18n = 'common.close';
  dismiss.addEventListener('click', () => modalManager.close());
  footer.appendChild(dismiss);

  card.append(header, body, footer);
  applyTranslations(shortcutModal);
  return shortcutModal;
}

function showShortcutModal() {
  const modal = buildShortcutModal();
  applyTranslations(modal);
  modalManager.open(modal, { restoreFocusTo: document.activeElement, escToClose: true });
}

function handleShortcutKey(event) {
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const tag = document.activeElement?.tagName;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
      event.preventDefault();
      router.navigate('/guides');
      guidesController?.focusSearch?.();
    }
    return;
  }
  if (event.ctrlKey && !event.shiftKey && !event.altKey) {
    if (event.key === '/' || event.key === '?') {
      event.preventDefault();
      showShortcutModal();
    } else if (event.key.toLowerCase() === 'g') {
      event.preventDefault();
      router.navigate('/guides');
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      if (guidesController?.resumeLastGuide?.()) {
        showToast(toastRoot, translate('guides.resumeToast', {
          guide: guidesController.getLastGuideMeta()?.title || '',
        }));
      }
    }
  }
}

function handleQuickAction() {
  if (quickActionState.type === 'resume' && quickActionState.guide) {
    if (guidesController?.resumeLastGuide?.()) {
      showToast(toastRoot, translate('guides.resumeToast', {
        guide: guidesController.getLastGuideMeta()?.title || quickActionState.guide.title,
      }));
    }
  } else {
    router.navigate('/guides');
    guidesController?.focusSearch?.();
  }
}

function initSwipeNavigation() {
  const routes = ['/', '/guides', '/manual', '/ethics', '/about', '/settings'];
  viewRoot.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    const [touch] = event.touches;
    swipeStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }, { passive: true });

  viewRoot.addEventListener('touchend', (event) => {
    if (!swipeStart) return;
    const { x: startX, y: startY, time } = swipeStart;
    const deltaTime = Date.now() - time;
    swipeStart = null;
    if (deltaTime > 600) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    const currentPath = router.getCurrent()?.path || '/';
    const index = routes.indexOf(currentPath);
    if (dx < 0 && index < routes.length - 1) {
      router.navigate(routes[index + 1]);
    } else if (dx > 0 && index > 0) {
      router.navigate(routes[index - 1]);
    }
  }, { passive: true });
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
  router.addRoute('/manual', async () => {
    setActiveView('/manual');
    updateNavState('/manual');
    await handleManualRoute(document.getElementById('manual-content'));
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
  updateNavState(router.getCurrent()?.path || '/');
}

function handleGuideProgress(event) {
  const detail = event.detail || {};
  if (detail.guide) {
    lastGuideMeta = detail.guide;
  }
  if (!navigator.onLine) {
    offlineQueue.push({ messageKey: 'guides.progressGlobal', params: detail.summaryParams });
  }
  updateGlobalProgress(detail.summary);
  if (detail.status === 'completed' && navigator.onLine) {
    showToast(toastRoot, translate('guides.completeToast', { guide: detail.guide?.title || '' }));
  }
}

async function bootstrap() {
  html.dataset.rm = prefersReducedMotion ? 'on' : 'off';
  setFontScalePreference(storedFontScale);
  setContrastPreference(storedContrast);
  applyReducedMotionUI();
  applyFontScaleUI();
  applyContrastUI();

  initTooltips();

  await initI18n(storedLanguage);
  languageSelect.value = getCurrentLanguage();
  applyTranslations(document.body);
  if (!unsubscribeLanguage) {
    unsubscribeLanguage = onLanguageChange(() => {
      applyTranslations(document.body);
      updateOfflineStatus();
      updateBreadcrumbs(router.getCurrent()?.path || '/');
      updateGlobalProgress();
      if (shortcutModal) {
        applyTranslations(shortcutModal);
      }
    });
  }

  router = createRouter();
  initializeGuides(router);
  setupRouter();
  bindMenuControls();
  bindNavigation();
  handleLanguageChange();
  handleReducedMotionToggle();
  handleFontScaleChange();
  handleContrastToggle();
  handleInstallPrompt();
  watchConnectivity();
  registerServiceWorker();
  showDisclaimerOnLoad();
  initSwipeNavigation();
  updateGlobalProgress();
  appShell?.classList.add('ready');

  document.addEventListener('guideprogress', handleGuideProgress);
  window.addEventListener('keydown', handleShortcutKey);
  quickAction?.addEventListener('click', handleQuickAction);
}

document.addEventListener('DOMContentLoaded', async () => {
  await bootstrap();
});
