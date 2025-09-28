import { translate, applyTranslations, getCurrentLanguage, onLanguageChange } from '../i18n.js';

const LANGUAGE_SOURCES = {
  en: new URL('./data/ethics.en.md', window.location.href).toString(),
  he: new URL('./data/ethics.he.md', window.location.href).toString(),
};

const cachedMarkdown = new Map();

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n');
}

function createList(lines) {
  const list = document.createElement('ul');
  lines.forEach((line) => {
    const value = line.replace(/^[-•]\s*/, '').replace(/^✋\s*/, '').trim();
    if (!value) return;
    const item = document.createElement('li');
    item.textContent = value;
    list.appendChild(item);
  });
  return list;
}

function isHeading(line) {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/[:：]$/.test(trimmed)) {
    return true;
  }
  const hasLetters = /[A-Za-z]/.test(trimmed);
  return hasLetters && trimmed === trimmed.toUpperCase();
}

function createParagraph(text) {
  const paragraph = document.createElement('p');
  paragraph.textContent = text.replace(/\s+/g, ' ').trim();
  return paragraph;
}

function transformMarkdown(markdown) {
  const fragment = document.createDocumentFragment();
  if (!markdown) return fragment;
  const blocks = normalizeText(markdown).split(/\n\s*\n/);
  blocks.forEach((block) => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return;
    const lines = trimmedBlock.split('\n').map((line) => line.trim());
    const listLines = lines.filter((line) => /^[-•✋]/.test(line));
    if (listLines.length === lines.length && listLines.length > 0) {
      fragment.appendChild(createList(listLines));
      return;
    }
    const [firstLine, ...rest] = lines;
    if (isHeading(firstLine)) {
      const heading = document.createElement('h3');
      heading.textContent = firstLine.replace(/[:：]$/, '').trim();
      fragment.appendChild(heading);
      if (rest.length) {
        fragment.appendChild(createParagraph(rest.join(' ')));
      }
      return;
    }
    fragment.appendChild(createParagraph(lines.join(' ')));
  });
  return fragment;
}

function getSourceForLanguage(language) {
  if (language && LANGUAGE_SOURCES[language]) {
    return LANGUAGE_SOURCES[language];
  }
  return LANGUAGE_SOURCES.en;
}

async function fetchMarkdown(source, code) {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Failed to load ethics document for ${code}`);
  }
  const text = await response.text();
  cachedMarkdown.set(code, text);
  return text;
}

async function loadMarkdown(language) {
  const candidates = [language, 'en'].filter(Boolean);
  for (const code of candidates) {
    if (cachedMarkdown.has(code)) {
      return cachedMarkdown.get(code);
    }
    const source = getSourceForLanguage(code);
    try {
      return await fetchMarkdown(source, code);
    } catch (error) {
      if (code === 'en') {
        throw error;
      }
    }
  }
  throw new Error('Failed to load ethics document');
}

let renderToken = 0;

export async function renderEthics(root) {
  if (!root) return;

  root.innerHTML = '';
  root.classList.add('page-ethics');

  const main = document.createElement('main');
  main.setAttribute('role', 'main');
  const card = document.createElement('div');
  card.className = 'glass';

  const heading = document.createElement('h1');
  heading.id = 'ethics-title';
  heading.tabIndex = -1;
  heading.dataset.i18n = 'pages.ethics.title';
  heading.textContent = translate('pages.ethics.title');

  const intro = document.createElement('p');
  intro.dataset.i18n = 'pages.ethics.intro';
  intro.textContent = translate('pages.ethics.intro');

  const content = document.createElement('div');
  content.className = 'ethics-content';

  const backLink = document.createElement('a');
  backLink.href = '#/about';
  backLink.classList.add('link', 'back-link');
  backLink.dataset.i18n = 'pages.ethics.back';
  backLink.textContent = translate('pages.ethics.back');

  card.append(heading, intro, content, backLink);
  main.appendChild(card);
  root.appendChild(main);
  applyTranslations(card);

  if (root._ethicsUnsubscribe) {
    root._ethicsUnsubscribe();
    delete root._ethicsUnsubscribe;
  }

  const updateContent = async () => {
    const token = ++renderToken;
    try {
      const language = getCurrentLanguage();
      const markdown = await loadMarkdown(language);
      if (token !== renderToken) {
        return;
      }
      content.innerHTML = '';
      content.appendChild(transformMarkdown(markdown));
    } catch (error) {
      console.error(error);
      content.innerHTML = '';
      const paragraph = createParagraph(translate('pages.ethics.loadError'));
      paragraph.dataset.i18n = 'pages.ethics.loadError';
      content.appendChild(paragraph);
      applyTranslations(content);
    }
  };

  await updateContent();

  root._ethicsUnsubscribe = onLanguageChange(() => {
    updateContent();
  });

  requestAnimationFrame(() => {
    heading.focus({ preventScroll: true });
  });
}
