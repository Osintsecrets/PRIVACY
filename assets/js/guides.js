import {
  createChip,
  createModal,
  showToast,
  createSearchField,
  setupRovingTabIndex,
  svgPhoneFrame,
  svgDesktopFrame,
} from './components.js';
import { translate, onLanguageChange, applyTranslations } from './i18n.js';

function createStrings() {
  return {
    searchLabel: translate('guides.searchLabel'),
    searchPlaceholder: translate('guides.searchPlaceholder'),
    allCategories: translate('guides.allCategories'),
    emptyState: translate('guides.empty'),
    viewGuide: translate('guides.view'),
    openStep: translate('guides.openStep'),
    stepProgress: (current, total) => translate('guides.stepProgress', { current, total }),
    previous: translate('guides.previous'),
    next: translate('guides.next'),
    finish: translate('guides.finish'),
    closeWizard: translate('guides.closeWizard'),
    chipsAria: translate('guides.chipsAria'),
    stepsCount: (count) => translate('guides.stepsCount', { count }),
    cardAriaLabel: (title) => translate('guides.cardAriaLabel', { title }),
    loadError: translate('guides.toastLoadError'),
    notFoundTitle: translate('guides.notFound'),
    notFoundBody: translate('guides.notFoundBody'),
    noSteps: translate('guides.noSteps'),
  };
}

let STRINGS = createStrings();

const state = {
  router: null,
  indexContainer: null,
  detail: null,
  toastRoot: null,
  guidesData: null,
  categories: [],
  categoryMap: new Map(),
  activeCategory: 'all',
  searchTerm: '',
  searchInput: null,
  chipsContainer: null,
  resultsContainer: null,
  emptyStateEl: null,
  chipNavCleanup: null,
  detailMetaRow: null,
  restoreFocusSlug: null,
  restoreFocusAction: 'card',
  hasInitializedIndex: false,
  hasVisitedIndex: false,
  currentGuide: null,
};

let unsubscribeLanguage = null;

function refreshLocalizedContent() {
  STRINGS = createStrings();
  if (state.hasInitializedIndex && state.indexContainer) {
    renderCategoryChips();
    updateChipSelection();
    renderGuideCards();
  } else if (state.indexContainer) {
    applyTranslations(state.indexContainer);
  }

  if (state.detail?.section) {
    if (state.currentGuide) {
      state.detail.title.textContent = state.currentGuide.title;
      state.detail.title.removeAttribute('data-i18n');
      state.detail.summary.innerHTML = state.currentGuide.why ? formatRichText(state.currentGuide.why) : '';
      state.detail.summary.removeAttribute('data-i18n');
      if (state.detailMetaRow) {
        state.detailMetaRow.innerHTML = '';
        if (state.currentGuide.category) {
          const badge = document.createElement('span');
          badge.className = 'guide-badge';
          badge.textContent = state.categoryMap.get(state.currentGuide.category)?.label || state.currentGuide.category;
          state.detailMetaRow.appendChild(badge);
        }
        const stepsBadge = document.createElement('span');
        stepsBadge.className = 'guide-badge';
        stepsBadge.textContent = STRINGS.stepsCount(state.currentGuide.steps.length);
        state.detailMetaRow.appendChild(stepsBadge);
      }
      buildDetailSteps(state.currentGuide);
    } else {
      applyTranslations(state.detail.section);
    }
  }

  if (state.emptyStateEl) {
    state.emptyStateEl.textContent = STRINGS.emptyState;
  }
}

function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatRichText(text = '') {
  const escaped = escapeHtml(text);
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

async function loadGuidesData() {
  if (state.guidesData) return state.guidesData;
  const response = await fetch('./data/guides-facebook.json');
  if (!response.ok) {
    throw new Error('Failed to load guides');
  }
  const data = await response.json();
  state.guidesData = data;
  return data;
}

async function loadCategories() {
  if (state.categories.length) return state.categories;
  const response = await fetch('./data/categories.json');
  if (!response.ok) {
    throw new Error('Failed to load categories');
  }
  const data = await response.json();
  const categories = Array.isArray(data.facebook) ? data.facebook : [];
  state.categories = categories;
  state.categoryMap = new Map(categories.map((category) => [category.id, category]));
  return categories;
}

function ensureDetailMeta(detailView) {
  if (state.detailMetaRow) return;
  const heading = detailView.querySelector('.section-heading');
  if (!heading) return;
  const metaRow = document.createElement('div');
  metaRow.className = 'guide-meta-row';
  heading.appendChild(metaRow);
  state.detailMetaRow = metaRow;
}

function ensureIndexLayout() {
  if (state.hasInitializedIndex) return;
  state.indexContainer.innerHTML = '';

  const indexWrapper = document.createElement('div');
  indexWrapper.className = 'guides-index';

  const controls = document.createElement('div');
  controls.className = 'guides-controls';

  const { wrapper: searchField, input } = createSearchField({
    id: 'guides-search',
    label: STRINGS.searchLabel,
    labelKey: 'guides.searchLabel',
    placeholder: STRINGS.searchPlaceholder,
    placeholderKey: 'guides.searchPlaceholder',
    onChange: handleSearchChange,
    delay: 180,
  });
  state.searchInput = input;
  controls.appendChild(searchField);

  const chips = document.createElement('div');
  chips.className = 'guide-category-chips';
  chips.setAttribute('role', 'radiogroup');
  chips.setAttribute('aria-label', STRINGS.chipsAria);
  chips.dataset.i18nAttrAriaLabel = 'guides.chipsAria';
  state.chipsContainer = chips;
  controls.appendChild(chips);

  indexWrapper.appendChild(controls);

  const results = document.createElement('div');
  results.className = 'guides-grid';
  results.setAttribute('role', 'list');
  state.resultsContainer = results;
  indexWrapper.appendChild(results);

  const empty = document.createElement('p');
  empty.className = 'guides-empty';
  empty.textContent = STRINGS.emptyState;
  empty.dataset.i18n = 'guides.empty';
  empty.hidden = true;
  state.emptyStateEl = empty;
  indexWrapper.appendChild(empty);

  state.indexContainer.appendChild(indexWrapper);
  state.hasInitializedIndex = true;

  if (!state.chipNavCleanup) {
    state.chipNavCleanup = setupRovingTabIndex(state.chipsContainer, '.guide-chip[role="radio"]', {
      orientation: 'horizontal',
      loop: true,
    });
  }

  applyTranslations(state.indexContainer);
}

function syncIndexQuery() {
  if (!state.router) return;
  const params = new URLSearchParams();
  if (state.activeCategory && state.activeCategory !== 'all') {
    params.set('category', state.activeCategory);
  }
  if (state.searchTerm) {
    params.set('q', state.searchTerm);
  }
  const queryString = params.toString();
  const target = queryString ? `/guides?${queryString}` : '/guides';
  state.router.navigate(target, { replace: true, silent: true });
}

function handleSearchChange(value) {
  const next = value.trim();
  if (next === state.searchTerm) return;
  state.searchTerm = next;
  syncIndexQuery();
  renderGuideCards();
}

function setActiveCategory(categoryId, { fromUser = false } = {}) {
  const isValid = categoryId && state.categoryMap.has(categoryId);
  const nextCategory = categoryId === 'all' || !isValid ? (categoryId === 'all' ? 'all' : state.activeCategory) : categoryId;
  const resolved = categoryId === 'all' ? 'all' : nextCategory;
  if (resolved === state.activeCategory) {
    if (fromUser) {
      updateChipSelection();
    }
    return;
  }
  state.activeCategory = resolved;
  updateChipSelection();
  syncIndexQuery();
  renderGuideCards();
}

function updateChipSelection() {
  if (!state.chipsContainer) return;
  const buttons = Array.from(state.chipsContainer.querySelectorAll('.guide-chip[role="radio"]'));
  buttons.forEach((button) => {
    const value = button.dataset.value;
    const isActive = value === state.activeCategory || (!state.categoryMap.has(value) && state.activeCategory === 'all');
    button.setAttribute('aria-checked', isActive ? 'true' : 'false');
    button.tabIndex = isActive ? 0 : -1;
    button.classList.toggle('is-active', isActive);
  });
}

function renderCategoryChips() {
  if (!state.chipsContainer) return;
  state.chipsContainer.innerHTML = '';
  const allChip = createChip(STRINGS.allCategories);
  allChip.classList.add('guide-chip');
  allChip.dataset.value = 'all';
  allChip.setAttribute('role', 'radio');
  allChip.setAttribute('aria-checked', state.activeCategory === 'all' ? 'true' : 'false');
  allChip.tabIndex = state.activeCategory === 'all' ? 0 : -1;
  allChip.dataset.i18n = 'guides.allCategories';
  allChip.addEventListener('click', () => setActiveCategory('all', { fromUser: true }));
  allChip.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setActiveCategory('all', { fromUser: true });
    }
  });
  state.chipsContainer.appendChild(allChip);

  state.categories.forEach((category) => {
    const chip = createChip(category.label);
    chip.classList.add('guide-chip');
    chip.dataset.value = category.id;
    chip.setAttribute('role', 'radio');
    const isActive = state.activeCategory === category.id;
    chip.setAttribute('aria-checked', isActive ? 'true' : 'false');
    chip.tabIndex = isActive ? 0 : -1;
    chip.addEventListener('click', () => setActiveCategory(category.id, { fromUser: true }));
    chip.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setActiveCategory(category.id, { fromUser: true });
      }
    });
    state.chipsContainer.appendChild(chip);
  });

  applyTranslations(state.chipsContainer);
}

function matchesFilters(guide) {
  const matchesCategory = state.activeCategory === 'all' || guide.category === state.activeCategory;
  if (!matchesCategory) return false;
  if (!state.searchTerm) return true;
  const haystack = `${guide.title} ${(guide.why || '')}`.toLowerCase();
  return haystack.includes(state.searchTerm.toLowerCase());
}

function goToGuideDetail(guideId, origin, action = 'card') {
  state.restoreFocusSlug = guideId;
  state.restoreFocusAction = action;
  state.router.navigate(`/guides/${guideId}`);
}

function createGuideCard(guide) {
  const card = document.createElement('article');
  card.className = 'guide-card';
  card.dataset.slug = guide.id;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', STRINGS.cardAriaLabel(guide.title));

  const header = document.createElement('div');
  header.className = 'guide-card-header';
  const title = document.createElement('h3');
  title.className = 'guide-card-title';
  title.textContent = guide.title;
  header.appendChild(title);

  if (guide.category) {
    const badge = document.createElement('span');
    badge.className = 'guide-badge';
    const category = state.categoryMap.get(guide.category);
    badge.textContent = category ? category.label : guide.category;
    header.appendChild(badge);
  }

  card.appendChild(header);

  if (guide.why) {
    const why = document.createElement('p');
    why.className = 'guide-card-why';
    why.innerHTML = formatRichText(guide.why);
    card.appendChild(why);
  }

  const meta = document.createElement('p');
  meta.className = 'guide-card-meta';
  meta.textContent = STRINGS.stepsCount(guide.steps.length);
  card.appendChild(meta);

  const actionRow = document.createElement('div');
  actionRow.className = 'guide-card-actions';
  const actionBtn = document.createElement('button');
  actionBtn.type = 'button';
  actionBtn.className = 'guide-card-cta';
  actionBtn.textContent = STRINGS.viewGuide;
  actionBtn.dataset.i18n = 'guides.view';
  actionBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    goToGuideDetail(guide.id, actionBtn, 'cta');
  });
  actionRow.appendChild(actionBtn);
  card.appendChild(actionRow);

  card.addEventListener('click', () => {
    goToGuideDetail(guide.id, card, 'card');
  });

  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      goToGuideDetail(guide.id, card, 'card');
    }
  });

  applyTranslations(card);
  return card;
}

function renderGuideCards() {
  if (!state.resultsContainer) return;
  state.resultsContainer.innerHTML = '';
  const guides = (state.guidesData?.guides || []).filter(matchesFilters);
  if (!guides.length) {
    state.emptyStateEl.hidden = false;
    return;
  }
  state.emptyStateEl.hidden = true;
  guides.forEach((guide) => {
    const card = createGuideCard(guide);
    state.resultsContainer.appendChild(card);
  });
  applyTranslations(state.resultsContainer);
  if (!state.hasVisitedIndex && state.searchInput) {
    state.searchInput.focus({ preventScroll: true });
    state.hasVisitedIndex = true;
  } else if (state.restoreFocusSlug) {
    const selector = state.restoreFocusAction === 'cta'
      ? `.guide-card[data-slug="${state.restoreFocusSlug}"] .guide-card-cta`
      : `.guide-card[data-slug="${state.restoreFocusSlug}"]`;
    const target = state.resultsContainer.querySelector(selector) || state.resultsContainer.querySelector(`.guide-card[data-slug="${state.restoreFocusSlug}"]`);
    if (target) {
      target.focus({ preventScroll: true });
    }
    state.restoreFocusSlug = null;
  }
}

function parseStepFromQuery(query) {
  if (!query) return null;
  const raw = Number(query.get('step'));
  if (!Number.isFinite(raw)) return null;
  const index = raw - 1;
  return index >= 0 ? index : null;
}

function clearStepQuery(guideId) {
  if (!state.router) return;
  state.router.navigate(`/guides/${guideId}`, { replace: true, silent: true });
}

function openGuideWizard(guide, initialIndex, originButton) {
  const total = guide.steps.length;
  let current = Math.min(Math.max(initialIndex || 0, 0), total - 1);

  if (originButton) {
    originButton.focus({ preventScroll: true });
  }

  const progress = document.createElement('p');
  progress.className = 'wizard-progress';
  const bodyCopy = document.createElement('div');
  bodyCopy.className = 'wizard-body';

  const modal = createModal({
    title: guide.title,
    subtitle: '',
    content: (() => {
      const wrapper = document.createElement('div');
      wrapper.appendChild(progress);
      wrapper.appendChild(bodyCopy);
      return wrapper;
    })(),
    actions: [],
    onClose: () => {
      clearStepQuery(guide.id);
    },
    closeOnEscape: false,
  });

  modal.closeBtn.setAttribute('aria-label', STRINGS.closeWizard);
  modal.closeBtn.dataset.i18nAttrAriaLabel = 'guides.closeWizard';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.textContent = STRINGS.previous;
  prevBtn.dataset.i18n = 'guides.previous';
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.textContent = STRINGS.next;

  prevBtn.addEventListener('click', () => {
    if (current > 0) {
      current -= 1;
      update();
      state.router.navigate(`/guides/${guide.id}?step=${current + 1}`, { replace: true, silent: true });
    }
  });

  nextBtn.addEventListener('click', () => {
    if (current < total - 1) {
      current += 1;
      update();
      state.router.navigate(`/guides/${guide.id}?step=${current + 1}`, { replace: true, silent: true });
    } else {
      modal.close();
    }
  });

  modal.footer.appendChild(prevBtn);
  modal.footer.appendChild(nextBtn);

  function update() {
    const step = guide.steps[current];
    progress.textContent = STRINGS.stepProgress(current + 1, total);
    const subtitleExisting = modal.header.querySelector('.modal-subtitle');
    if (subtitleExisting) {
      subtitleExisting.remove();
    }
    const subtitle = document.createElement('p');
    subtitle.className = 'modal-subtitle';
    subtitle.textContent = step.title;
    modal.header.appendChild(subtitle);
    bodyCopy.innerHTML = '';
    if (step.schematic) {
      let schematicEl = null;
      if (step.schematic.type === 'phone') {
        schematicEl = svgPhoneFrame({ ...step.schematic });
      } else if (step.schematic.type === 'desktop') {
        schematicEl = svgDesktopFrame({ ...step.schematic });
      }
      if (schematicEl) {
        bodyCopy.appendChild(schematicEl);
      }
    }
    const text = document.createElement('p');
    text.innerHTML = formatRichText(step.body);
    bodyCopy.appendChild(text);
    prevBtn.disabled = current === 0;
    const isLastStep = current === total - 1;
    nextBtn.textContent = isLastStep ? STRINGS.finish : STRINGS.next;
    nextBtn.dataset.i18n = isLastStep ? 'guides.finish' : 'guides.next';
    applyTranslations(modal.header);
    applyTranslations(modal.footer);
  }

  update();
  modal.open();
}

function buildDetailSteps(guide) {
  state.detail.steps.innerHTML = '';
  guide.steps.forEach((step, index) => {
    const item = document.createElement('li');
    item.className = 'step-card';

    const header = document.createElement('div');
    header.className = 'step-card-header';

    const number = document.createElement('span');
    number.className = 'step-card-number';
    number.textContent = String(index + 1);
    header.appendChild(number);

    const title = document.createElement('h3');
    title.className = 'step-card-title';
    title.textContent = step.title;
    header.appendChild(title);

    item.appendChild(header);

    const body = document.createElement('p');
    body.className = 'step-card-body';
    body.innerHTML = formatRichText(step.body);
    item.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'step-card-actions';
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'step-open';
    openBtn.textContent = STRINGS.openStep;
    openBtn.dataset.i18n = 'guides.openStep';
    openBtn.dataset.stepIndex = String(index);
    openBtn.addEventListener('click', () => {
      state.router.navigate(`/guides/${guide.id}?step=${index + 1}`, { replace: true, silent: true });
      openGuideWizard(guide, index, openBtn);
    });
    actions.appendChild(openBtn);
    item.appendChild(actions);

    state.detail.steps.appendChild(item);
  });
  applyTranslations(state.detail.steps);
}

async function ensureDataLoaded() {
  try {
    const [guides] = await Promise.all([loadGuidesData(), loadCategories()]);
    state.guidesData = guides;
  } catch (error) {
    console.error(error);
    if (state.toastRoot) {
      showToast(state.toastRoot, STRINGS.loadError);
    }
  }
}

function applyQueryToState(query) {
  const categoryParam = query.get('category');
  if (categoryParam && (categoryParam === 'all' || state.categoryMap.has(categoryParam))) {
    state.activeCategory = categoryParam === 'all' ? 'all' : categoryParam;
  } else {
    state.activeCategory = 'all';
  }
  const searchParam = query.get('q');
  state.searchTerm = searchParam ? searchParam.trim() : '';
  if (state.searchInput) {
    state.searchInput.value = state.searchTerm;
  }
  renderCategoryChips();
  updateChipSelection();
}

export function initGuidesModule({ router, indexContainer, detail, toastRoot }) {
  state.router = router;
  state.indexContainer = indexContainer;
  state.detail = detail;
  state.toastRoot = toastRoot;
  ensureDetailMeta(detail.section);

  if (!unsubscribeLanguage) {
    unsubscribeLanguage = onLanguageChange(() => {
      refreshLocalizedContent();
    });
  }

  return {
    async showIndex({ query }) {
      state.currentGuide = null;
      await ensureDataLoaded();
      ensureIndexLayout();
      applyQueryToState(query || new URLSearchParams());
      renderGuideCards();
    },
    async showDetail({ slug, query }) {
      await ensureDataLoaded();
      const guide = (state.guidesData?.guides || []).find((item) => item.id === slug);
      if (!guide) {
        state.detail.title.textContent = STRINGS.notFoundTitle;
        state.detail.title.dataset.i18n = 'guides.notFound';
        state.detail.summary.textContent = STRINGS.notFoundBody;
        state.detail.summary.dataset.i18n = 'guides.notFoundBody';
        state.detail.steps.innerHTML = '';
        const emptyItem = document.createElement('li');
        emptyItem.className = 'step-card';
        emptyItem.textContent = STRINGS.noSteps;
        emptyItem.dataset.i18n = 'guides.noSteps';
        state.detail.steps.appendChild(emptyItem);
        if (state.detailMetaRow) {
          state.detailMetaRow.innerHTML = '';
        }
        state.currentGuide = null;
        return;
      }
      state.currentGuide = guide;
      state.detail.title.textContent = guide.title;
      delete state.detail.title.dataset.i18n;
      state.detail.title.removeAttribute('data-i18n');
      state.detail.summary.innerHTML = guide.why ? formatRichText(guide.why) : '';
      state.detail.summary.removeAttribute('data-i18n');
      if (state.detailMetaRow) {
        state.detailMetaRow.innerHTML = '';
        if (guide.category) {
          const badge = document.createElement('span');
          badge.className = 'guide-badge';
          badge.textContent = state.categoryMap.get(guide.category)?.label || guide.category;
          state.detailMetaRow.appendChild(badge);
        }
        const stepsBadge = document.createElement('span');
        stepsBadge.className = 'guide-badge';
        stepsBadge.textContent = STRINGS.stepsCount(guide.steps.length);
        state.detailMetaRow.appendChild(stepsBadge);
      }
      buildDetailSteps(guide);
      const stepIndex = parseStepFromQuery(query);
      if (stepIndex !== null && stepIndex >= 0 && stepIndex < guide.steps.length) {
        const origin = state.detail.steps.querySelector(`.step-open[data-step-index="${stepIndex}"]`);
        if (origin) {
          openGuideWizard(guide, stepIndex, origin);
        }
      }
    },
  };
}
