import { createRouter } from './router.js';
import { createChip, createModal, showToast, createPopover, showTooltip } from './components.js';
import { showDisclaimerOnLoad } from './disclaimer.js';

const views = {
  home: document.getElementById('view-home'),
  guides: document.getElementById('view-guides'),
  guideDetail: document.getElementById('view-guide-detail'),
  tools: document.getElementById('view-tools'),
  about: document.getElementById('view-about'),
  settings: document.getElementById('view-settings'),
};

const dockItems = Array.from(document.querySelectorAll('.dock-item'));
const viewRoot = document.getElementById('view-root');
const platformGrid = document.getElementById('platform-grid');
const quickChipRow = document.getElementById('quick-action-chips');
const categoriesContainer = document.getElementById('guide-categories');
const guideTitle = document.getElementById('guide-detail-title');
const guideSummary = document.getElementById('guide-detail-summary');
const guideStepList = document.getElementById('guide-step-list');
const toastRoot = document.getElementById('toast-root');
const installButton = document.getElementById('install-button');
const installHint = document.getElementById('install-hint');
const offlineIndicator = document.getElementById('offline-indicator');
const languageSelect = document.getElementById('language-select');
const reducedMotionToggle = document.getElementById('reduced-motion-toggle');

const state = {
  platforms: null,
  guides: null,
  currentGuide: null,
  preferences: {
    language: localStorage.getItem('sra:language') || 'en',
    reducedMotion: localStorage.getItem('sra:reduced-motion') === 'true',
  },
  deferredPrompt: null,
};

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

async function loadGuides() {
  if (state.guides) return state.guides;
  try {
    const response = await fetch('./data/guides-facebook.json');
    const data = await response.json();
    state.guides = data;
  } catch (error) {
    console.error('Failed to load guides', error);
    showToast(toastRoot, 'Unable to load guides.');
    state.guides = { categories: [], guides: [] };
  }
  return state.guides;
}

function renderHome() {
  loadPlatforms().then((platforms) => {
    platformGrid.innerHTML = '';
    platforms.filter((platform) => platform.enabled).forEach((platform) => {
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

function renderGuideCategories() {
  loadGuides().then((guideData) => {
    categoriesContainer.innerHTML = '';
    (guideData.categories || []).forEach((category) => {
      const card = document.createElement('section');
      card.className = 'category-card';
      const title = document.createElement('h2');
      title.textContent = category.title;
      card.appendChild(title);

      const list = document.createElement('ul');
      list.className = 'category-list';
      (category.guides || []).forEach((item) => {
        const listItem = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.title;
        button.dataset.slug = item.id;
        button.addEventListener('click', () => {
          window.location.hash = `#/guides/${item.id}`;
        });
        listItem.appendChild(button);
        list.appendChild(listItem);
      });
      card.appendChild(list);
      categoriesContainer.appendChild(card);
    });
  });
}

function buildStepList(guide) {
  guideStepList.innerHTML = '';
  guide.steps.forEach((step, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'step-item';

    const details = document.createElement('details');
    if (index === 0) {
      details.open = true;
    }
    const summary = document.createElement('summary');
    summary.className = 'step-header';
    summary.innerHTML = `<span>Step ${index + 1}. ${step.title}</span>`;
    details.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'step-body';
    body.innerHTML = `<p>${step.body}</p>`;
    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.textContent = 'Open step';
    openButton.dataset.stepIndex = index;
    openButton.addEventListener('click', (event) => {
      event.stopPropagation();
      openGuideWizard(guide, index, openButton);
      updateStepQuery(index + 1, guide.id);
    });
    body.appendChild(openButton);
    details.appendChild(body);

    listItem.appendChild(details);
    guideStepList.appendChild(listItem);
  });
}

function updateStepQuery(stepNumber, slug) {
  const base = `#/guides/${slug}`;
  window.location.hash = `${base}?step=${stepNumber}`;
}

function clearStepQuery(slug) {
  const base = `#/guides/${slug}`;
  if (window.location.hash.startsWith(base)) {
    window.history.replaceState(null, '', `${window.location.origin}${window.location.pathname}${base}`);
  }
}

function openGuideWizard(guide, initialStep = 0, originButton) {
  let current = initialStep;
  const total = guide.steps.length;

  const content = document.createElement('div');
  const meta = document.createElement('p');
  meta.className = 'modal-subtitle';
  const body = document.createElement('p');
  body.className = 'modal-body-copy';
  const diagram = document.createElement('div');
  diagram.className = 'modal-diagram';
  diagram.innerHTML = `
    <svg viewBox="0 0 160 90" width="100%" height="100%" aria-hidden="true">
      <rect x="10" y="10" width="140" height="70" rx="12" ry="12" fill="none" stroke="rgba(111,243,255,0.35)" stroke-dasharray="6 6"/>
      <circle cx="40" cy="45" r="10" fill="rgba(15,240,252,0.15)" stroke="rgba(15,240,252,0.8)"/>
      <rect x="70" y="30" width="70" height="30" rx="6" ry="6" fill="rgba(10,20,26,0.7)" stroke="rgba(106,227,255,0.6)"/>
    </svg>
  `;

  content.appendChild(meta);
  content.appendChild(body);
  content.appendChild(diagram);

  const modal = createModal({
    title: guide.title,
    subtitle: '',
    content,
    actions: [],
    onClose: () => {
      clearStepQuery(guide.id);
      if (originButton) {
        originButton.focus();
      }
    },
  });

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.textContent = 'Previous';
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.textContent = 'Next';

  prevBtn.addEventListener('click', () => {
    if (current > 0) {
      current -= 1;
      update();
      updateStepQuery(current + 1, guide.id);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (current < total - 1) {
      current += 1;
      update();
      updateStepQuery(current + 1, guide.id);
    } else {
      modal.close();
    }
  });

  modal.footer.appendChild(prevBtn);
  modal.footer.appendChild(nextBtn);

  function update() {
    const step = guide.steps[current];
    meta.textContent = `Step ${current + 1} of ${total}`;
    body.textContent = step.body;
    modal.header.querySelector('.modal-title').textContent = `${guide.title}`;
    modal.header.querySelector('.modal-subtitle')?.remove();
    const subtitle = document.createElement('p');
    subtitle.className = 'modal-subtitle';
    subtitle.textContent = step.title;
    modal.header.appendChild(subtitle);
    prevBtn.disabled = current === 0;
    if (current === total - 1) {
      nextBtn.textContent = 'Finish';
    } else {
      nextBtn.textContent = 'Next';
    }
  }

  update();
  modal.open();
}

function parseStepFromQuery(query) {
  const stepValue = Number(query.get('step'));
  if (!Number.isFinite(stepValue)) return null;
  const stepIndex = stepValue - 1;
  return stepIndex >= 0 ? stepIndex : null;
}

function renderGuideDetail(slug, query) {
  loadGuides().then((guideData) => {
    const guide = (guideData.guides || []).find((item) => item.id === slug);
    if (!guide) {
      guideTitle.textContent = 'Guide not found';
      guideSummary.textContent = '';
      guideStepList.innerHTML = '<li>No guide steps available.</li>';
      return;
    }
    state.currentGuide = guide;
    guideTitle.textContent = guide.title;
    guideSummary.textContent = `${guide.steps.length} steps to complete.`;
    buildStepList(guide);
    const stepIndex = parseStepFromQuery(query);
    if (stepIndex !== null && stepIndex < guide.steps.length) {
      const firstButton = guideStepList.querySelector(`button[data-step-index="${stepIndex}"]`);
      openGuideWizard(guide, stepIndex, firstButton);
    }
  });
}

function handleNavButtons() {
  document.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = button.dataset.nav;
      if (target) {
        event.preventDefault();
        window.location.hash = `#${target}`;
      }
    });
  });
}

function initSettings() {
  languageSelect.value = state.preferences.language;
  reducedMotionToggle.checked = state.preferences.reducedMotion;

  languageSelect.addEventListener('change', () => {
    state.preferences.language = languageSelect.value;
    localStorage.setItem('sra:language', state.preferences.language);
    showToast(toastRoot, `Language set to ${languageSelect.options[languageSelect.selectedIndex].text}`);
  });

  reducedMotionToggle.addEventListener('change', () => {
    state.preferences.reducedMotion = reducedMotionToggle.checked;
    localStorage.setItem('sra:reduced-motion', String(state.preferences.reducedMotion));
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
      navigator.serviceWorker.register('./sw.js').then((registration) => {
        if (registration.waiting) {
          showToast(toastRoot, 'Update ready. Refresh to apply.');
        }
      }).catch((error) => {
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

function initBannerTooltip() {
  const bannerButton = document.querySelector('[data-banner-tooltip]');
  const tooltip = document.getElementById('banner-tooltip');
  if (!bannerButton || !tooltip) return;

  let removeTooltip = null;
  const tooltipText = tooltip.textContent.trim();

  const show = () => {
    if (!tooltipText) return;
    if (typeof removeTooltip === 'function') {
      removeTooltip();
    }
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
    if (event.key === 'Escape') {
      hide();
    }
  });
}

function initInfoPopover() {
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
        <h3 class="h3">Be aware of fast-moving risks</h3>
        <p>We surface emerging content, privacy, and access risks so you can respond quickly.</p>
        <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
          <button data-close type="button">Close</button>
        </div>
      `,
      onClose: () => {
        activePopover = null;
        if (document.contains(trigger)) {
          trigger.focus();
        }
      },
    });

    const closeButton = activePopover.el.querySelector('[data-close]');
    if (closeButton) {
      closeButton.addEventListener('click', () => activePopover?.close());
    }
  });
}

function setupRouter() {
  const router = createRouter();

  router.addRoute('/', ({ path }) => {
    setActiveView('home');
    setActiveDock(path);
    renderHome();
  });

  router.addRoute('/guides', ({ path }) => {
    setActiveView('guides');
    setActiveDock(path);
    renderGuideCategories();
  });

  router.addRoute('/guides/:slug', ({ params, query, path }) => {
    setActiveView('guideDetail');
    setActiveDock('/guides');
    renderGuideDetail(params.slug, query);
  });

  router.addRoute('/tools', ({ path }) => {
    setActiveView('tools');
    setActiveDock(path);
  });

  router.addRoute('/about', ({ path }) => {
    setActiveView('about');
    setActiveDock(path);
  });

  router.addRoute('/settings', ({ path }) => {
    setActiveView('settings');
    setActiveDock(path);
  });

  router.setNotFound(() => {
    setActiveView('home');
    setActiveDock('/');
  });

  router.start();
}

function init() {
  initSettings();
  initPWA();
  initConnectivity();
  initBannerTooltip();
  initInfoPopover();
  handleNavButtons();
  setupRouter();
  showDisclaimerOnLoad();
}

document.addEventListener('DOMContentLoaded', init);
