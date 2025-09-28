import { createRouter, handleEthicsRoute } from './router.js';
import { createChip, showToast } from './components.js';
import { initGuidesModule } from './guides.js';
import { showDisclaimerOnLoad } from './disclaimer.js';

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

const state = {
  platforms: null,
  preferences: {
    language: localStorage.getItem('sra:language') || 'en',
    reducedMotion: localStorage.getItem('sra:reduced-motion') === 'true',
  },
  deferredPrompt: null,
};

let router = null;
let guidesModule = null;

const BASE_TITLE = 'Social Risk Audit';

function updateDocumentTitle(segment) {
  document.title = segment ? `${segment} — ${BASE_TITLE}` : BASE_TITLE;
}

function applyReducedMotionPreference() {
  if (!document.body) return;
  const shouldReduce = Boolean(state.preferences.reducedMotion);
  document.body.classList.toggle('prefers-reduced-motion', shouldReduce);
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
    showToast(toastRoot, 'Unable to load platforms.');
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
        card.innerHTML = `
          <h2>${platform.label}</h2>
          <p>Identify content and privacy risks unique to Facebook.</p>
        `;
        const action = document.createElement('a');
        action.href = '#/guides';
        action.className = 'primary-button';
        action.textContent = 'Open Guides';
        card.appendChild(action);
        platformGrid.appendChild(card);
      });
  });

  quickChipRow.innerHTML = '';
  ['Lock profile settings', 'Clean up old photos', 'Review app access'].forEach((label) => {
    const chip = createChip(label);
    chip.setAttribute('aria-disabled', 'true');
    chip.disabled = true;
    quickChipRow.appendChild(chip);
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
  languageSelect.value = state.preferences.language;
  reducedMotionToggle.checked = state.preferences.reducedMotion;
  applyReducedMotionPreference();

  languageSelect.addEventListener('change', () => {
    state.preferences.language = languageSelect.value;
    localStorage.setItem('sra:language', state.preferences.language);
    showToast(toastRoot, `Language set to ${languageSelect.options[languageSelect.selectedIndex].text}`);
  });

  reducedMotionToggle.addEventListener('change', () => {
    state.preferences.reducedMotion = reducedMotionToggle.checked;
    localStorage.setItem('sra:reduced-motion', String(state.preferences.reducedMotion));
    applyReducedMotionPreference();
    showToast(toastRoot, state.preferences.reducedMotion ? 'Reduced motion enabled.' : 'Reduced motion disabled.');
  });

  installButton.disabled = true;
  installButton.addEventListener('click', async () => {
    if (state.deferredPrompt) {
      state.deferredPrompt.prompt();
      const choice = await state.deferredPrompt.userChoice;
      showToast(toastRoot, choice.outcome === 'accepted' ? 'App install started.' : 'Install dismissed.');
      state.deferredPrompt = null;
      installButton.disabled = true;
    } else {
      showToast(toastRoot, 'Install prompt not available yet.');
    }
  });
}

function initPWA() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    installButton.disabled = false;
    installHint.textContent = 'Ready to install.';
  });

  window.addEventListener('appinstalled', () => {
    showToast(toastRoot, 'App installed successfully.');
    installButton.disabled = true;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((registration) => {
          if (registration.waiting) {
            showToast(toastRoot, 'Update ready. Refresh to apply.');
          }
        })
        .catch((error) => {
          console.error('Service worker registration failed', error);
        });

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'updateavailable') {
          showToast(toastRoot, 'New version ready. Refresh to update.');
        }
      });
    });
  }
}

function initConnectivity() {
  function updateStatus() {
    const isOnline = navigator.onLine;
    offlineIndicator.textContent = `Status: ${isOnline ? 'Online' : 'Offline (retrying...)'}`;
  }
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
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
    updateDocumentTitle('Guides');
    guidesModule.showIndex({ query });
  });

  router.addRoute('/guides/:slug', ({ params, query }) => {
    setActiveView('guideDetail');
    setActiveDock('/guides');
    updateDocumentTitle('Guides');
    guidesModule.showDetail({ slug: params.slug, query });
  });

  router.addRoute('/tools', ({ path }) => {
    setActiveView('tools');
    setActiveDock(path);
    updateDocumentTitle('Tools');
  });

  router.addRoute('/about', ({ path }) => {
    setActiveView('about');
    setActiveDock(path);
    updateDocumentTitle('About');
  });

  router.addRoute('/ethics', async ({ path }) => {
    setActiveView('ethics');
    setActiveDock('/about');
    await handleEthicsRoute(views.ethics);
  });

  router.addRoute('/settings', ({ path }) => {
    setActiveView('settings');
    setActiveDock(path);
    updateDocumentTitle('Settings');
  });

  router.setNotFound(() => {
    setActiveView('home');
    setActiveDock('/');
    updateDocumentTitle();
  });

  router.start();
}

function init() {
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
  showDisclaimerOnLoad();
}

document.addEventListener('DOMContentLoaded', init);
