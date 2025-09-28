const SOURCE_URL = '/data/ethics.md';
let cachedMarkdown = null;

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

async function loadMarkdown() {
  if (cachedMarkdown) {
    return cachedMarkdown;
  }
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error('Failed to load ethics document');
  }
  cachedMarkdown = await response.text();
  return cachedMarkdown;
}

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
  heading.textContent = 'Ethics & Morality';

  const intro = document.createElement('p');
  intro.dataset.i18n = 'pages.ethics.intro';
  intro.textContent = 'Our work is privacy-first, consent-based, and never used to harm. This page states the standards.';

  const content = document.createElement('div');
  content.className = 'ethics-content';

  const backLink = document.createElement('a');
  backLink.href = '#/about';
  backLink.classList.add('link', 'back-link');
  backLink.textContent = 'Back to About';

  card.append(heading, intro, content, backLink);
  main.appendChild(card);
  root.appendChild(main);

  try {
    const markdown = await loadMarkdown();
    content.innerHTML = '';
    content.appendChild(transformMarkdown(markdown));
  } catch (error) {
    console.error(error);
    content.innerHTML = '';
    content.appendChild(createParagraph('We could not load the ethics statement. Please try again later.'));
  }

  requestAnimationFrame(() => {
    heading.focus({ preventScroll: true });
  });
}
