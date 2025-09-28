import { translate, applyTranslations, getCurrentLanguage, onLanguageChange } from '../i18n.js';

const MANUAL_SOURCES = {
  en: new URL('./data/manual.en.json', window.location.href).toString(),
  he: new URL('./data/manual.he.json', window.location.href).toString(),
};

const GUIDES_SOURCE = new URL('./data/guides-facebook.json', window.location.href).toString();

const manualCache = new Map();
let guidesCache = null;

function getManualSource(language) {
  if (language && MANUAL_SOURCES[language]) {
    return MANUAL_SOURCES[language];
  }
  return MANUAL_SOURCES.en;
}

async function loadManual(language) {
  const attempts = [language, 'en'].filter(Boolean);
  for (const code of attempts) {
    if (manualCache.has(code)) {
      return manualCache.get(code);
    }
    const source = getManualSource(code);
    try {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to load manual for ${code}`);
      }
      const json = await response.json();
      const payload = { ...json, _language: code };
      manualCache.set(code, payload);
      if (language && language !== code && !manualCache.has(language)) {
        manualCache.set(language, payload);
      }
      return payload;
    } catch (error) {
      if (code === 'en') {
        throw error;
      }
    }
  }
  throw new Error('Unable to load manual document');
}

async function loadGuides() {
  if (guidesCache) return guidesCache;
  const response = await fetch(GUIDES_SOURCE);
  if (!response.ok) {
    throw new Error('Failed to load manual guides dataset');
  }
  const data = await response.json();
  guidesCache = Array.isArray(data?.guides) ? data : { guides: [], categories: [] };
  return guidesCache;
}

function createParagraph(text, className) {
  if (!text) return null;
  const paragraph = document.createElement('p');
  if (className) {
    paragraph.className = className;
  }
  paragraph.textContent = text;
  return paragraph;
}

function renderOverview(sections) {
  if (!Array.isArray(sections) || !sections.length) return null;
  const list = document.createElement('ul');
  list.className = 'manual-overview-list';
  sections.forEach((section) => {
    const item = document.createElement('li');
    item.className = 'manual-overview-item';
    const link = document.createElement('a');
    link.href = `#manual-section-${section.id}`;
    link.textContent = `${section.prefix || ''}. ${section.title}`.replace(/^\.\s*/, '');
    item.appendChild(link);
    list.appendChild(item);
  });
  return list;
}

function createStepElement(step) {
  const item = document.createElement('li');
  item.className = 'manual-step';
  if (step?.title) {
    const title = document.createElement('span');
    title.className = 'manual-step-title';
    title.textContent = step.title;
    item.appendChild(title);
  }
  if (step?.body) {
    const body = document.createElement('p');
    body.className = 'manual-step-body';
    body.textContent = step.body;
    item.appendChild(body);
  }
  const note = step?.schematic?.note || step?.note;
  if (note) {
    const hint = document.createElement('p');
    hint.className = 'manual-step-note';
    hint.textContent = note;
    item.appendChild(hint);
  }
  return item;
}

function renderGuide(guide) {
  const article = document.createElement('article');
  article.className = 'manual-guide';

  const header = document.createElement('header');
  header.className = 'manual-guide-header';
  const title = document.createElement('h4');
  title.textContent = guide.title;
  header.appendChild(title);
  article.appendChild(header);

  if (guide.why) {
    const why = document.createElement('p');
    why.className = 'manual-guide-why';
    const label = document.createElement('span');
    label.className = 'manual-label';
    label.textContent = `${translate('manual.purposeLabel')}:`;
    const text = document.createElement('span');
    text.textContent = ` ${guide.why}`;
    why.append(label, text);
    article.appendChild(why);
  }

  if (Array.isArray(guide.steps) && guide.steps.length) {
    const listLabel = document.createElement('p');
    listLabel.className = 'manual-label-inline';
    listLabel.textContent = translate('manual.stepsLabel');
    article.appendChild(listLabel);

    const list = document.createElement('ol');
    list.className = 'manual-step-list';
    guide.steps.forEach((step) => {
      list.appendChild(createStepElement(step));
    });
    article.appendChild(list);
  }

  return article;
}

function renderSection(section, guides) {
  const container = document.createElement('section');
  container.className = 'manual-section';
  container.id = `manual-section-${section.id}`;

  const heading = document.createElement('h3');
  heading.innerHTML = `<span class="manual-section-prefix">${section.prefix || ''}</span> ${section.title}`;
  container.appendChild(heading);

  if (section.description) {
    const description = createParagraph(section.description, 'manual-section-description');
    if (description) {
      container.appendChild(description);
    }
  }

  if (guides.length) {
    guides.forEach((guide) => {
      container.appendChild(renderGuide(guide));
    });
  }

  return container;
}

let renderToken = 0;

export async function renderManual(root) {
  if (!root) return;

  root.innerHTML = '';
  root.classList.add('page-manual');

  const main = document.createElement('main');
  main.className = 'manual-card glass';

  const heading = document.createElement('h1');
  heading.id = 'manual-title';
  heading.tabIndex = -1;
  heading.dataset.i18n = 'manual.heading';
  heading.textContent = translate('manual.heading');

  const lede = document.createElement('p');
  lede.className = 'manual-lede';
  lede.dataset.i18n = 'manual.lede';
  lede.textContent = translate('manual.lede');

  const updated = document.createElement('p');
  updated.className = 'manual-updated';
  updated.hidden = true;

  const introSection = document.createElement('section');
  introSection.className = 'manual-intro';

  const overviewSection = document.createElement('section');
  overviewSection.className = 'manual-overview';

  const sectionsContainer = document.createElement('div');
  sectionsContainer.className = 'manual-sections';

  const finalSection = document.createElement('section');
  finalSection.className = 'manual-final';

  main.append(heading, lede, updated, introSection, overviewSection, sectionsContainer, finalSection);
  root.appendChild(main);
  applyTranslations(main);

  if (root._manualCleanup) {
    root._manualCleanup();
    delete root._manualCleanup;
  }

  const updateContent = async () => {
    const token = ++renderToken;
    try {
      const language = getCurrentLanguage();
      const [manual, guidesData] = await Promise.all([loadManual(language), loadGuides()]);
      if (token !== renderToken) {
        return;
      }

      updated.hidden = !manual.updated;
      if (manual.updated) {
        updated.textContent = translate('common.updated', { date: manual.updated });
      }

      introSection.innerHTML = '';
      if (manual.introTitle) {
        const introHeading = document.createElement('h2');
        introHeading.textContent = manual.introTitle;
        introSection.appendChild(introHeading);
      }
      manual.intro?.forEach((paragraph) => {
        const element = createParagraph(paragraph);
        if (element) introSection.appendChild(element);
      });
      manual.principles?.forEach((paragraph) => {
        const element = createParagraph(paragraph, 'manual-principle');
        if (element) introSection.appendChild(element);
      });

      overviewSection.innerHTML = '';
      if (manual.overviewTitle) {
        const overviewHeading = document.createElement('h2');
        overviewHeading.textContent = manual.overviewTitle;
        overviewSection.appendChild(overviewHeading);
      }
      const overviewList = renderOverview(manual.sections);
      if (overviewList) {
        overviewSection.appendChild(overviewList);
      }

      sectionsContainer.innerHTML = '';
      const guideEntries = Array.isArray(guidesData.guides) ? guidesData.guides : [];
      manual.sections?.forEach((section) => {
        const sectionGuides = guideEntries.filter((guide) => guide.category === section.id);
        sectionsContainer.appendChild(renderSection(section, sectionGuides));
      });

      finalSection.innerHTML = '';
      if (manual.finalTitle || manual.final?.length) {
        if (manual.finalTitle) {
          const finalHeading = document.createElement('h2');
          finalHeading.textContent = manual.finalTitle;
          finalSection.appendChild(finalHeading);
        }
        manual.final?.forEach((paragraph) => {
          const element = createParagraph(paragraph);
          if (element) finalSection.appendChild(element);
        });
      }
    } catch (error) {
      console.error(error);
      introSection.innerHTML = '';
      overviewSection.innerHTML = '';
      sectionsContainer.innerHTML = '';
      finalSection.innerHTML = '';
      updated.hidden = true;
      const message = createParagraph(translate('manual.loadError'));
      if (message) {
        sectionsContainer.appendChild(message);
      }
    }
  };

  await updateContent();

  const unsubscribe = onLanguageChange(() => {
    updateContent();
  });

  root._manualCleanup = () => {
    unsubscribe();
  };

  requestAnimationFrame(() => {
    heading.focus({ preventScroll: true });
  });
}
