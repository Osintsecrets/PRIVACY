import { translate, applyTranslations, onLanguageChange, getCurrentLanguage } from '../i18n.js';
import { debounce, showToast } from '../components.js';
import { modalManager } from '../utils/modal.js';

const DATA_URL = './data/guides.json';
const PROGRESS_KEY = 'sra:guide-progress';
const LEVEL_FILTERS = [
  { value: 'all', labelKey: 'guides.filterAll' },
  { value: 'basic', labelKey: 'guides.filterBasic' },
  { value: 'intermediate', labelKey: 'guides.filterIntermediate' },
  { value: 'advanced', labelKey: 'guides.filterAdvanced' },
];

const state = {
  topics: [],
  filter: 'all',
  search: '',
  loaded: false,
  elements: {
    searchInput: null,
    filterContainer: null,
    resultsMeta: null,
    resultCount: null,
    cardsContainer: null,
    emptyState: null,
    resumeButton: null,
    toastRoot: null,
  },
  router: null,
  progress: {},
};

let unsubscribeLanguage = null;

function loadProgress() {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    state.progress = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('Failed to read stored progress', error); // eslint-disable-line no-console
    state.progress = {};
  }
}

function persistProgress() {
  try {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(state.progress));
  } catch (error) {
    console.warn('Failed to store progress', error); // eslint-disable-line no-console
  }
}

function setProgress(topicId, stepIndex) {
  if (typeof stepIndex === 'number' && stepIndex >= 0) {
    state.progress[topicId] = stepIndex;
  } else {
    delete state.progress[topicId];
  }
  persistProgress();
  updateResumeButton();
}

function getProgress(topicId) {
  return typeof state.progress[topicId] === 'number' ? state.progress[topicId] : null;
}

function updateResumeButton() {
  const { resumeButton } = state.elements;
  if (!resumeButton) return;
  const storedIds = Object.keys(state.progress);
  if (!storedIds.length) {
    resumeButton.hidden = true;
    resumeButton.setAttribute('aria-hidden', 'true');
    resumeButton.dataset.topic = '';
    return;
  }
  const topicId = storedIds[0];
  const topic = state.topics.find((item) => item.id === topicId);
  if (!topic) {
    resumeButton.hidden = true;
    resumeButton.setAttribute('aria-hidden', 'true');
    resumeButton.dataset.topic = '';
    return;
  }
  resumeButton.hidden = false;
  resumeButton.removeAttribute('aria-hidden');
  resumeButton.dataset.topic = topicId;
  resumeButton.dataset.step = String(getProgress(topicId) ?? 0);
  resumeButton.textContent = `${translate('guides.resume')} – ${topic.title}`;
}

async function fetchGuides() {
  if (state.loaded) return state.topics;
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
      throw new Error('Failed to load guides');
    }
    const data = await response.json();
    const topics = Array.isArray(data.topics) ? data.topics : [];
    state.topics = topics.map((topic) => ({
      ...topic,
      level: topic.level || 'basic',
      tags: Array.isArray(topic.tags) ? topic.tags : [],
      steps: Array.isArray(topic.steps) ? topic.steps : [],
    }));
    state.loaded = true;
    return state.topics;
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
    if (state.elements.toastRoot) {
      showToast(state.elements.toastRoot, translate('guides.toastLoadError'));
    }
    return [];
  }
}

function matchesFilters(topic) {
  const levelPass = state.filter === 'all' || topic.level === state.filter;
  if (!levelPass) return false;
  if (!state.search) return true;
  const haystack = `${topic.title} ${topic.summary || ''} ${topic.tags.join(' ')}`.toLowerCase();
  return haystack.includes(state.search.toLowerCase());
}

function renderResultCount(count) {
  const { resultCount } = state.elements;
  if (!resultCount) return;
  const text = translate('guides.resultsCount', { count });
  resultCount.textContent = text;
  resultCount.dataset.count = String(count);
  resultCount.dispatchEvent(new CustomEvent('announce', { bubbles: false }));
}

function announceResults(count) {
  const { resultsMeta } = state.elements;
  if (!resultsMeta) return;
  let liveRegion = resultsMeta.querySelector('[data-live-announcer]');
  if (!liveRegion) {
    liveRegion = document.createElement('p');
    liveRegion.dataset.liveAnnouncer = 'true';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'visually-hidden';
    resultsMeta.appendChild(liveRegion);
  }
  liveRegion.textContent = translate('guides.resultAnnouncement', { count });
}

function createTagList(tags) {
  if (!tags.length) return '';
  return tags.join(translate('common.tagJoin'));
}

function renderCards() {
  const { cardsContainer, emptyState } = state.elements;
  if (!cardsContainer || !emptyState) return;
  cardsContainer.innerHTML = '';
  const matches = state.topics.filter(matchesFilters);
  renderResultCount(matches.length);
  announceResults(matches.length);
  if (!matches.length) {
    emptyState.hidden = false;
    applyTranslations(emptyState);
    return;
  }
  emptyState.hidden = true;
  matches.forEach((topic) => {
    const card = document.createElement('article');
    card.className = 'card guide-card animated';
    card.setAttribute('role', 'listitem');
    card.dataset.topicId = topic.id;

    const header = document.createElement('header');
    header.innerHTML = `<h3>${topic.title}</h3>`;
    card.appendChild(header);

    if (topic.summary) {
      const summary = document.createElement('p');
      summary.textContent = topic.summary;
      card.appendChild(summary);
    }

    const badges = document.createElement('div');
    badges.className = 'guide-badges';
    const levelBadge = document.createElement('span');
    levelBadge.className = 'badge';
    levelBadge.textContent = translate('guides.cardLevel', { level: translate(`guides.filter${topic.level.charAt(0).toUpperCase()}${topic.level.slice(1)}`) || topic.level });
    badges.appendChild(levelBadge);

    if (topic.tags.length) {
      const tagsBadge = document.createElement('span');
      tagsBadge.className = 'badge';
      tagsBadge.textContent = translate('guides.cardTags', { tags: createTagList(topic.tags) });
      badges.appendChild(tagsBadge);
    }
    card.appendChild(badges);

    const actionRow = document.createElement('div');
    actionRow.className = 'card-actions';
    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'button';
    startBtn.dataset.topicId = topic.id;
    startBtn.textContent = translate('guides.startGuide');
    startBtn.addEventListener('click', () => openWizard(topic, getProgress(topic.id) ?? 0, startBtn));
    actionRow.appendChild(startBtn);
    card.appendChild(actionRow);

    if (topic.notes) {
      const details = document.createElement('div');
      details.className = 'card-details';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.textContent = translate('guides.detailsToggleExpand');
      toggle.setAttribute('aria-expanded', 'false');
      const notes = document.createElement('p');
      notes.hidden = true;
      notes.textContent = topic.notes;
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        toggle.textContent = translate(expanded ? 'guides.detailsToggleExpand' : 'guides.detailsToggleCollapse');
        notes.hidden = expanded;
      });
      details.append(toggle, notes);
      card.appendChild(details);
    }

    cardsContainer.appendChild(card);
  });
}

function handleSearchInput(event) {
  state.search = event.target.value.trim();
  renderCards();
}

function setFilter(value) {
  state.filter = value;
  renderCards();
  const buttons = state.elements.filterContainer?.querySelectorAll('button[data-filter]');
  buttons?.forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.filter === value ? 'true' : 'false');
  });
}

function renderFilters() {
  const { filterContainer } = state.elements;
  if (!filterContainer) return;
  filterContainer.innerHTML = '';
  LEVEL_FILTERS.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-chip';
    button.dataset.filter = filter.value;
    button.textContent = translate(filter.labelKey);
    button.setAttribute('aria-pressed', filter.value === state.filter ? 'true' : 'false');
    button.addEventListener('click', () => setFilter(filter.value));
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setFilter(filter.value);
      }
    });
    filterContainer.appendChild(button);
  });
}

function updateLanguage() {
  renderFilters();
  renderCards();
  applyTranslations(state.elements.cardsContainer?.closest('.view'));
  updateResumeButton();
}

function createWizardStep(topic, stepIndex, stepContainer, notesContainer) {
  const step = topic.steps[stepIndex];
  stepContainer.innerHTML = '';
  const stepTitle = document.createElement('h3');
  stepTitle.textContent = step.text;
  stepContainer.appendChild(stepTitle);

  const stepMeta = document.createElement('p');
  stepMeta.className = 'step-meta';
  stepMeta.textContent = translate('guides.wizardProgress', { current: stepIndex + 1, total: topic.steps.length });
  stepContainer.appendChild(stepMeta);

  if (step.platform) {
    const platformNote = document.createElement('p');
    platformNote.className = 'step-platform';
    platformNote.textContent = step.platform;
    stepContainer.appendChild(platformNote);
  }

  if (topic.notes) {
    notesContainer.hidden = false;
    notesContainer.textContent = `${translate('guides.wizardNotes')}: ${topic.notes}`;
  } else {
    notesContainer.hidden = true;
  }
}

function openWizard(topic, startIndex = 0, originButton = null) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay guide-wizard';
  overlay.id = `wizard-${topic.id}`;
  overlay.setAttribute('aria-labelledby', `wizard-title-${topic.id}`);
  overlay.setAttribute('aria-describedby', `wizard-body-${topic.id}`);

  const card = document.createElement('div');
  card.className = 'modal-card guide-wizard-card';
  overlay.appendChild(card);

  const header = document.createElement('header');
  header.className = 'modal-header';
  const title = document.createElement('h2');
  title.id = `wizard-title-${topic.id}`;
  title.textContent = topic.title;
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'button';
  closeBtn.setAttribute('aria-label', translate('common.close'));
  closeBtn.textContent = translate('common.close');
  closeBtn.addEventListener('click', () => {
    modalManager.close();
  });
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'modal-body';
  body.id = `wizard-body-${topic.id}`;

  const stepContainer = document.createElement('div');
  stepContainer.className = 'wizard-step';
  const notesContainer = document.createElement('p');
  notesContainer.className = 'wizard-notes';

  body.append(stepContainer, notesContainer);

  const footer = document.createElement('div');
  footer.className = 'modal-actions';
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'button';
  backBtn.textContent = translate('guides.wizardBack');
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'button';
  nextBtn.textContent = translate('guides.wizardNext');

  footer.append(backBtn, nextBtn);
  card.append(header, body, footer);

  let index = Math.min(Math.max(startIndex, 0), topic.steps.length - 1);

  function updateButtons() {
    backBtn.disabled = index === 0;
    const isLast = index === topic.steps.length - 1;
    nextBtn.textContent = translate(isLast ? 'guides.wizardDone' : 'guides.wizardNext');
    nextBtn.dataset.action = isLast ? 'done' : 'next';
  }

  function updateStep() {
    createWizardStep(topic, index, stepContainer, notesContainer);
    setProgress(topic.id, index);
    updateButtons();
  }

  backBtn.addEventListener('click', () => {
    if (index > 0) {
      index -= 1;
      updateStep();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (nextBtn.dataset.action === 'done') {
      setProgress(topic.id, null);
      modalManager.close();
      return;
    }
    if (index < topic.steps.length - 1) {
      index += 1;
      updateStep();
    }
  });

  modalManager.open(overlay, {
    restoreFocusTo: originButton || document.activeElement,
    escToClose: true,
  });
  updateStep();
}

export function initGuidesPage({
  router,
  controls,
  cards,
  resultCount,
  emptyState,
  filterContainer,
  resumeButton,
  toastRoot,
}) {
  state.router = router;
  state.elements.searchInput = controls?.querySelector('input[type="search"]') || null;
  state.elements.filterContainer = filterContainer;
  state.elements.resultCount = resultCount;
  state.elements.resultsMeta = controls;
  state.elements.cardsContainer = cards;
  state.elements.emptyState = emptyState;
  state.elements.resumeButton = resumeButton;
  state.elements.toastRoot = toastRoot;

  loadProgress();
  updateResumeButton();

  renderFilters();

  if (state.elements.searchInput) {
    state.elements.searchInput.addEventListener('input', debounce(handleSearchInput, 250));
    state.elements.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        const firstCard = cards?.querySelector('.guide-card .button');
        if (firstCard) {
          event.preventDefault();
          firstCard.focus();
        }
      }
    });
  }

  if (resumeButton) {
    resumeButton.addEventListener('click', () => {
      const topicId = resumeButton.dataset.topic;
      if (!topicId) return;
      const topic = state.topics.find((item) => item.id === topicId);
      if (!topic) return;
      openWizard(topic, getProgress(topicId) ?? 0, resumeButton);
    });
  }

  if (!unsubscribeLanguage) {
    unsubscribeLanguage = onLanguageChange(() => {
      updateLanguage();
    });
  }

  return {
    async show() {
      await fetchGuides();
      renderCards();
      applyTranslations(controls?.closest('.view'));
    },
  };
}
