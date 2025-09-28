import { translate, applyTranslations, onLanguageChange } from '../i18n.js';
import { debounce, showToast } from '../components.js';
import { modalManager } from '../utils/modal.js';

const DATA_URL = './data/guides.json';
const PROGRESS_KEY = 'sra:guide-progress';
const BOOKMARK_KEY = 'sra:guide-bookmarks';
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
  bookmarks: new Set(),
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
  lastGuide: null,
};

let unsubscribeLanguage = null;

function normalizeProgressEntry(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') {
    return { status: 'active', step: raw };
  }
  if (typeof raw === 'object' && 'status' in raw) {
    const status = raw.status === 'complete' ? 'complete' : 'active';
    const step = typeof raw.step === 'number' ? raw.step : 0;
    return { status, step };
  }
  return null;
}

function loadProgress() {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    state.progress = Object.entries(parsed).reduce((acc, [key, value]) => {
      const normalized = normalizeProgressEntry(value);
      if (normalized) {
        acc[key] = normalized;
      }
      return acc;
    }, {});
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

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      state.bookmarks = new Set(parsed);
    }
  } catch (error) {
    console.warn('Failed to read bookmarks', error); // eslint-disable-line no-console
    state.bookmarks = new Set();
  }
}

function persistBookmarks() {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(Array.from(state.bookmarks)));
  } catch (error) {
    console.warn('Failed to persist bookmarks', error); // eslint-disable-line no-console
  }
}

function isBookmarked(topicId) {
  return state.bookmarks.has(topicId);
}

function setProgress(topic, stepIndex, status = 'updated') {
  if (!topic) return;
  if (typeof stepIndex === 'number' && stepIndex >= 0) {
    state.progress[topic.id] = { status: 'active', step: Math.min(stepIndex, topic.steps.length - 1) };
  } else if (stepIndex === null) {
    state.progress[topic.id] = { status: 'complete', step: topic.steps.length };
  } else {
    delete state.progress[topic.id];
  }
  persistProgress();
  updateResumeButton();
  dispatchProgressEvent(topic, status);
}

function getProgress(topicId) {
  return state.progress[topicId] || null;
}

function toggleBookmark(topic, button) {
  if (!topic) return;
  const isActive = isBookmarked(topic.id);
  if (isActive) {
    state.bookmarks.delete(topic.id);
    if (button) {
      button.textContent = translate('guides.bookmark');
      button.setAttribute('aria-pressed', 'false');
    }
    showToast(state.elements.toastRoot, translate('guides.bookmarkRemoved', { guide: topic.title }));
  } else {
    state.bookmarks.add(topic.id);
    if (button) {
      button.textContent = translate('guides.removeBookmark');
      button.setAttribute('aria-pressed', 'true');
    }
    showToast(state.elements.toastRoot, translate('guides.bookmarkAdded', { guide: topic.title }));
  }
  persistBookmarks();
}

function updateResumeButton() {
  const { resumeButton } = state.elements;
  if (!resumeButton) return;
  const activeEntries = Object.entries(state.progress).filter(([, entry]) => entry.status === 'active');
  if (!activeEntries.length) {
    resumeButton.hidden = true;
    resumeButton.setAttribute('aria-hidden', 'true');
    resumeButton.dataset.topic = '';
    resumeButton.dataset.step = '';
    return;
  }
  const [topicId, entry] = activeEntries[0];
  const topic = state.topics.find((item) => item.id === topicId);
  if (!topic) {
    resumeButton.hidden = true;
    resumeButton.setAttribute('aria-hidden', 'true');
    resumeButton.dataset.topic = '';
    resumeButton.dataset.step = '';
    return;
  }
  resumeButton.hidden = false;
  resumeButton.removeAttribute('aria-hidden');
  resumeButton.dataset.topic = topicId;
  resumeButton.dataset.step = String(entry.step ?? 0);
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
      level: topic.level || topic.difficulty || 'basic',
      tags: Array.isArray(topic.tags) ? topic.tags : [],
      steps: Array.isArray(topic.steps) ? topic.steps : [],
      category: topic.category || translate('guides.heading'),
      estimatedTime: topic.estimatedTime || '5 minutes',
    }));
    if (!state.lastGuide) {
      const activeEntries = Object.entries(state.progress);
      if (activeEntries.length) {
        const [topicId] = activeEntries[0];
        const topic = state.topics.find((item) => item.id === topicId);
        if (topic) {
          state.lastGuide = { id: topic.id, title: topic.title };
        }
      }
    }
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

function fuzzyMatch(query, text) {
  if (!query) return true;
  const needle = query.replace(/\s+/g, '').toLowerCase();
  const haystack = text.replace(/\s+/g, '').toLowerCase();
  let index = 0;
  for (const char of needle) {
    index = haystack.indexOf(char, index);
    if (index === -1) return false;
    index += 1;
  }
  return true;
}

function matchesFilters(topic) {
  const levelPass = state.filter === 'all' || topic.level === state.filter;
  if (!levelPass) return false;
  if (!state.search) return true;
  const haystack = `${topic.title} ${topic.summary || ''} ${topic.tags.join(' ')} ${topic.category}`;
  return fuzzyMatch(state.search, haystack);
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

function dispatchProgressEvent(topic, status = 'updated') {
  const summary = getCompletionSummary();
  const detail = {
    summary,
    summaryParams: {
      completed: summary.completedSteps,
      total: summary.totalSteps,
      percent: Math.round(summary.completedSteps / (summary.totalSteps || 1) * 100),
    },
    status,
    guide: topic ? { id: topic.id, title: topic.title } : null,
  };
  document.dispatchEvent(new CustomEvent('guideprogress', { detail }));
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

    const metaRow = document.createElement('div');
    metaRow.className = 'guide-meta';
    const stepBadge = document.createElement('span');
    stepBadge.className = 'badge';
    stepBadge.textContent = translate('guides.stepCount', { count: topic.steps.length });
    const levelBadge = document.createElement('span');
    levelBadge.className = 'badge';
    levelBadge.textContent = translate('guides.cardLevel', {
      level: translate(`guides.filter${topic.level.charAt(0).toUpperCase()}${topic.level.slice(1)}`) || topic.level,
    });
    const timeBadge = document.createElement('span');
    timeBadge.className = 'badge';
    timeBadge.textContent = translate('guides.cardTime', { time: topic.estimatedTime });
    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'badge';
    categoryBadge.textContent = translate('guides.cardCategory', { category: topic.category });
    metaRow.append(stepBadge, levelBadge, timeBadge, categoryBadge);
    card.appendChild(metaRow);

    if (topic.tags.length) {
      const tagsBadge = document.createElement('span');
      tagsBadge.className = 'badge';
      tagsBadge.textContent = translate('guides.cardTags', { tags: createTagList(topic.tags) });
      metaRow.appendChild(tagsBadge);
    }

    const totalSteps = Math.max(topic.steps.length, 1);
    const progressEntry = getProgress(topic.id);
    const completedSteps = progressEntry
      ? progressEntry.status === 'complete'
        ? topic.steps.length
        : Math.max(0, Math.min(progressEntry.step, totalSteps - 1))
      : 0;
    const percent = Math.round((completedSteps / totalSteps) * 100);
    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'card-progress';
    const progressLabel = document.createElement('p');
    progressLabel.textContent = translate('guides.progressGlobal', {
      completed: completedSteps,
      total: topic.steps.length,
      percent,
    });
    const track = document.createElement('div');
    track.className = 'progress-track';
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    bar.style.width = `${percent}%`;
    track.appendChild(bar);
    progressWrapper.append(progressLabel, track);
    card.appendChild(progressWrapper);

    const actionRow = document.createElement('div');
    actionRow.className = 'card-actions';
    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'button';
    startBtn.dataset.topicId = topic.id;
    startBtn.textContent = translate('guides.startGuide');
    startBtn.addEventListener('click', () => openWizard(topic, progressEntry?.step ?? 0, startBtn));

    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.type = 'button';
    bookmarkBtn.className = 'button';
    bookmarkBtn.dataset.topicId = topic.id;
    const bookmarked = isBookmarked(topic.id);
    bookmarkBtn.textContent = translate(bookmarked ? 'guides.removeBookmark' : 'guides.bookmark');
    bookmarkBtn.setAttribute('aria-pressed', bookmarked ? 'true' : 'false');
    bookmarkBtn.addEventListener('click', () => toggleBookmark(topic, bookmarkBtn));

    actionRow.append(startBtn, bookmarkBtn);
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
  state.lastGuide = { id: topic.id, title: topic.title };

  function updateButtons() {
    backBtn.disabled = index === 0;
    const isLast = index === topic.steps.length - 1;
    nextBtn.textContent = translate(isLast ? 'guides.wizardDone' : 'guides.wizardNext');
    nextBtn.dataset.action = isLast ? 'done' : 'next';
  }

  function updateStep() {
    createWizardStep(topic, index, stepContainer, notesContainer);
    setProgress(topic, index);
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
      setProgress(topic, null, 'completed');
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

export function getCompletionSummary() {
  const summary = {
    totalSteps: state.topics.reduce((acc, topic) => acc + topic.steps.length, 0),
    completedSteps: 0,
    activeGuide: null,
  };
  Object.entries(state.progress).forEach(([topicId, entry]) => {
    const topic = state.topics.find((item) => item.id === topicId);
    if (!topic) return;
    if (entry.status === 'complete') {
      summary.completedSteps += topic.steps.length;
    } else {
      const total = Math.max(topic.steps.length, 1);
      summary.completedSteps += Math.max(0, Math.min(entry.step, total - 1));
      if (!summary.activeGuide) {
        summary.activeGuide = { id: topic.id, title: topic.title };
      }
    }
  });
  if (!summary.activeGuide && state.lastGuide) {
    summary.activeGuide = state.lastGuide;
  }
  return summary;
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
  loadBookmarks();
  updateResumeButton();

  renderFilters();

  if (state.elements.searchInput) {
    state.elements.searchInput.addEventListener('input', debounce(handleSearchInput, 200));
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
      const entry = getProgress(topicId);
      openWizard(topic, entry?.step ?? 0, resumeButton);
      showToast(state.elements.toastRoot, translate('guides.resumeToast', { guide: topic.title }));
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
      dispatchProgressEvent(null);
    },
    focusSearch() {
      state.elements.searchInput?.focus();
    },
    resumeLastGuide() {
      const activeEntries = Object.entries(state.progress).filter(([, entry]) => entry.status === 'active');
      if (activeEntries.length) {
        const [topicId, entry] = activeEntries[0];
        const topic = state.topics.find((item) => item.id === topicId);
        if (topic) {
          openWizard(topic, entry.step ?? 0);
          return true;
        }
      }
      if (state.lastGuide) {
        const topic = state.topics.find((item) => item.id === state.lastGuide.id);
        if (topic) {
          openWizard(topic, 0);
          return true;
        }
      }
      return false;
    },
    getCompletionSummary,
    getLastGuideMeta() {
      return state.lastGuide;
    },
  };
}
