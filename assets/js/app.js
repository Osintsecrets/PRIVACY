// assets/js/app.js

import { createRouter, handleEthicsRoute } from './router.js';
import { createChip, showToast, showTooltip, createPopover } from './components.js';
import { initGuidesModule } from './guides.js';
import { showDisclaimerOnLoad } from './disclaimer.js';
import { initI18n, setLanguage, getCurrentLanguage, translate, applyTranslations, onLanguageChange } from './i18n.js';

const views = {
  home: document.getElementById('view-home'),
  guides: document.getElementById('view-guides'),
  guideDetail: document.getElementById('view-guide-detail'),
  tools: document.getElementById('view-tools'),
  about: document.getElementById('view-about'),
  ethics: document.getElementById('view-ethics'),
  settings: document.getElementById('view-settings'),
};

const dockItems = Array.from(document.querySelectorAll('.dock-item'));
const viewRoot = document.getElementById('view-root');
const platformGrid = document.getElementById('platform-grid');
const quickChipRow = document.getElementById('quick-action-chips');
const guideIndexContainer = document.getElementById('guide-categories');
const guideDetailTitle = document.getElementById('guide-detail-title');
const guideDetailSummary = document.getElementById('guide-detail-summary');
const guideStepList = document.getElementById('guide-step-list');
const toastRoot = document.getElementById('toast-root');
const installButton = document.getElementById('install-button');
const installHint = document.getElementById('install-hint');
const offlineIndicator = document.getElementById('offline-indicator');
const languageSelect = document.getElementById('language-select');
const reducedMotionToggle = document.getElementById('reduced-motion-toggle');

const storedLanguage = localStorage.getItem('sra:language');
const storedReducedMotion = localStorage.getItem('sra:reduced-motion');
const prefersReducedMotion = storedReducedMotion === null
  ? Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  : storedReducedMotion === 'true';

const state = {
  platforms: null,
  preferences: {
    language: storedLanguage || 'en',
    reducedMotion: prefersReducedMotion,
  },
  deferredPrompt: null,
};

let router = null;
let guidesModule = null;
let updateConnectivityStatus = null;
let languageSubscription = null;

function getBaseTitle() {
  return translate('app.title');
}

function updateDocumentTitle(segment) {
  const base = getBaseTitle();
  const value = segment ? `${segment} — ${base}` : base;
  document.title = value;
}

function applyReducedMotionPreference() {
  if (!document.body) return;
  const shouldReduce = Boolean(state.preferences.reducedMotion);
  document.body.classList.toggle('prefers-reduced-motion', shouldReduce);
  document.documentElement.classList.toggle('prefers-reduced-motion', shouldReduce);
  document.documentElement.style.scrollBehavior = shouldReduce ? 'auto' : 'smooth';
}

function setActiveView(viewKey) {
  Object.values(views).forEach((view) => {
    view.classList.remove('active');
  });
  if (viewKey && views[viewKey]) {
    views[viewKey].classList.add('active');
  }
  if (viewRoot) {
    viewRoot.focus({ preventScroll: true });
  }
  const scrollBehavior = state.preferences.reducedMotion ? 'auto' : 'smooth';
  window.requestAnimationFrame(() => {
    if (typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: scrollBehavior });
      } catch (error) {
        window.scrollTo(0, 0);
      }
    }
  });
}

function setActiveDock(path) {
  dockItems.forEach((item) => {
    const target = item.dataset.dock;
    if (path.startsWith(target)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

async function loadPlatforms() {
  if (state.platforms) return state.platforms;
  try {
    const response = await fetch('./data/platforms.json');
    const data = await response.json();
    state.platforms = data.platforms || [];
  } catch (error) {
    console.error('Failed to load platforms', error);
    showToast(toastRoot, translate('home.loadError'));
    state.platforms = [];
  }
  return state.platforms;
}

function renderHome() {
  loadPlatforms().then((platforms) => {
    platformGrid.innerHTML = '';
    platforms
      .filter((platform) => platform.enabled)
      .forEach((platform) => {
        if (platform.id !== 'facebook') return;
        const card = document.createElement('article');
        card.className = 'platform-card';
        const heading = document.createElement('h2');
        heading.textContent = platform.label;
        const description = document.createElement('p');
        description.dataset.i18n = 'home.platformDescription';
        description.textContent = translate('home.platformDescription');
        card.append(heading, description);
        const action = document.createElement('a');
        action.href = '#/guides';
        action.className = 'primary-button';
        action.dataset.i18n = 'home.cta';
        action.textContent = translate('home.cta');
        card.appendChild(action);
        platformGrid.appendChild(card);
        applyTranslations(card);
      });
  });

  quickChipRow.innerHTML = '';
  ['home.quickFix.lockProfile', 'home.quickFix.cleanPhotos', 'home.quickFix.reviewAccess'].forEach((key) => {
    const chip = createChip(translate(key));
    chip.setAttribute('aria-disabled', 'true');
    chip.disabled = true;
    chip.dataset.i18n = key;
    quickChipRow.appendChild(chip);
    applyTranslations(chip);
  });
}

function handleNavButtons() {
  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = button.dataset.nav;
      if (target) {
        event.preventDefault();
        router.navigate(target);
      }
    });
  });
}

function initSettings() {
  languageSelect.value = getCurrentLanguage();
  reducedMotionToggle.checked = state.preferences.reducedMotion;
  applyReducedMotionPreference();

  languageSelect.addEventListener('change', async () => {
    const nextLanguage = languageSelect.value;
    try {
      const resolved = await setLanguage(nextLanguage);
      state.preferences.language = resolved;
      localStorage.setItem('sra:language', state.preferences.language);
      const label = languageSelect.options[languageSelect.selectedIndex]?.textContent?.trim() || resolved;
      showToast(toastRoot, translate('settings.languageToast', { language: label }));
    } catch (error) {
      console.error('Failed to change language', error);
      showToast(toastRoot, translate('settings.languageError'));
      languageSelect.value = getCurrentLanguage();
    }
  });

  reducedMotionToggle.addEventListener('change', () => {
    state.preferences.reducedMotion = reducedMotionToggle.checked;
    localStorage.setItem('sra:reduced-motion', String(state.preferences.reducedMotion));
    applyReducedMotionPreference();
    showToast(
      toastRoot,
      translate(state.preferences.reducedMotion ? 'settings.motionEnabled' : 'settings.motionDisabled'),
    );
  });

  installButton.disabled = true;
  installButton.addEventListener('click', async () => {
    if (state.deferredPrompt) {
      state.deferredPrompt.prompt();
      const choice = await state.deferredPrompt.userChoice;
      showToast(
        toastRoot,
        translate(choice.outcome === 'accepted' ? 'settings.installStarted' : 'settings.installDismissed'),
      );
      state.deferredPrompt = null;
      installButton.disabled = true;
    } else {
      showToast(toastRoot, translate('settings.installUnavailable'));
    }
  });
}

function initPWA() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    installButton.disabled = false;
    installHint.dataset.i18n = 'settings.installReady';
    installHint.textContent = translate('settings.installReady');
  });

  window.addEventListener('appinstalled', () => {
    showToast(toastRoot, translate('settings.installComplete'));
    installButton.disabled = true;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((registration) => {
          if (registration.waiting) {
            showToast(toastRoot, translate('app.updateReady'));
          }
        })
        .catch((error) => {
          console.error('Service worker registration failed', error);
        });

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'updateavailable') {
          showToast(toastRoot, translate('app.updateAvailable'));
        }
      });
    });
  }
}

function initConnectivity() {
  function updateStatus() {
    const isOnline = navigator.onLine;
    const key = isOnline ? 'settings.offlineStatusOnline' : 'settings.offlineStatusOffline';
    offlineIndicator.dataset.i18n = key;
    offlineIndicator.textContent = translate(key);
  }
  updateConnectivityStatus = updateStatus;
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}

/**
 * Optional UX helpers (tooltip/popover) — safe no-ops if markup is missing.
 * Requires showTooltip/createPopover from components.js.
 */
function initBannerTooltip() {
  const bannerButton = document.querySelector('[data-banner-tooltip]');
  const tooltip = document.getElementById('banner-tooltip');
  if (!bannerButton || !tooltip || typeof showTooltip !== 'function') return;

  let removeTooltip = null;
  const getTooltipText = () => translate('home.bannerTooltip');

  const show = () => {
    const tooltipText = getTooltipText();
    if (!tooltipText) return;
    if (typeof removeTooltip === 'function') removeTooltip();
    removeTooltip = showTooltip(bannerButton, tooltipText);
  };

  const hide = () => {
    if (typeof removeTooltip === 'function') {
      removeTooltip();
      removeTooltip = null;
    }
  };

  bannerButton.addEventListener('focus', show);
  bannerButton.addEventListener('blur', hide);
  bannerButton.addEventListener('mouseenter', show);
  bannerButton.addEventListener('mouseleave', hide);
  bannerButton.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
}

function initInfoPopover() {
  if (typeof createPopover !== 'function') return;

  let activePopover = null;

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.info-trigger');
    if (!trigger) return;

    event.preventDefault();

    if (activePopover) {
      activePopover.close();
      activePopover = null;
    }

    activePopover = createPopover({
      html: `
        <h3 class="h3" data-i18n="home.popoverTitle">${translate('home.popoverTitle')}</h3>
        <p data-i18n="home.popoverBody">${translate('home.popoverBody')}</p>
        <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
          <button data-close type="button" data-i18n="common.close">${translate('common.close')}</button>
        </div>
      `,
      onClose: () => {
        activePopover = null;
        if (document.contains(trigger)) {
          trigger.focus();
        }
      },
    });
    applyTranslations(activePopover.el);

    const closeButton = activePopover.el.querySelector('[data-close]');
    if (closeButton) {
      closeButton.addEventListener('click', () => activePopover?.close());
    }
  });
}

function setupRouter() {
  router.addRoute('/', ({ path }) => {
    setActiveView('home');
    setActiveDock(path);
    updateDocumentTitle();
    renderHome();
  });

  router.addRoute('/guides', ({ query }) => {
    setActiveView('guides');
    setActiveDock('/guides');
    updateDocumentTitle(translate('guides.heading'));
    guidesModule.showIndex({ query });
  });

  router.addRoute('/guides/:slug', ({ params, query }) => {
    setActiveView('guideDetail');
    setActiveDock('/guides');
    updateDocumentTitle(translate('guides.heading'));
    guidesModule.showDetail({ slug: params.slug, query });
  });

  router.addRoute('/tools', ({ path }) => {
    setActiveView('tools');
    setActiveDock(path);
    updateDocumentTitle(translate('nav.tools'));
  });

  router.addRoute('/about', ({ path }) => {
    setActiveView('about');
    setActiveDock(path);
    updateDocumentTitle(translate('nav.about'));
  });

  router.addRoute('/ethics', async ({ path }) => {
    setActiveView('ethics');
    setActiveDock('/about');
    await handleEthicsRoute(views.ethics);
  });

  router.addRoute('/settings', ({ path }) => {
    setActiveView('settings');
    setActiveDock(path);
    updateDocumentTitle(translate('nav.settings'));
  });

  router.setNotFound(() => {
    setActiveView('home');
    setActiveDock('/');
    updateDocumentTitle();
  });

  router.start();
}

function handleLanguageChange() {
  applyTranslations(document);
  renderHome();
  if (typeof updateConnectivityStatus === 'function') {
    updateConnectivityStatus();
  }
  if (router) {
    const current = router.getCurrent();
    if (current) {
      switch (current.path) {
        case '/guides':
        case '/guides/':
          updateDocumentTitle(translate('guides.heading'));
          break;
        default:
          if (current.path.startsWith('/guides/')) {
            updateDocumentTitle(translate('guides.heading'));
          } else if (current.path.startsWith('/tools')) {
            updateDocumentTitle(translate('nav.tools'));
          } else if (current.path.startsWith('/about')) {
            updateDocumentTitle(translate('nav.about'));
          } else if (current.path.startsWith('/settings')) {
            updateDocumentTitle(translate('nav.settings'));
          } else if (current.path.startsWith('/ethics')) {
            updateDocumentTitle(translate('pages.ethics.title'));
          } else {
            updateDocumentTitle();
          }
      }
    } else {
      updateDocumentTitle();
    }
  } else {
    updateDocumentTitle();
  }
}

async function init() {
  await initI18n(state.preferences.language);
  state.preferences.language = getCurrentLanguage();
  applyTranslations(document);
  languageSubscription = onLanguageChange(handleLanguageChange);

  router = createRouter();
  guidesModule = initGuidesModule({
    router,
    indexContainer: guideIndexContainer,
    detail: {
      title: guideDetailTitle,
      summary: guideDetailSummary,
      steps: guideStepList,
      section: views.guideDetail,
    },
    toastRoot,
  });

  initSettings();
  initPWA();
  initConnectivity();
  handleNavButtons();
  setupRouter();
  handleLanguageChange();
  initBannerTooltip();
  initInfoPopover();
  showDisclaimerOnLoad();
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => {
    console.error('App failed to initialize', error);
  });
});
