const SUPPORTED_LANGUAGES = ['en', 'he'];
const FALLBACK_LANGUAGE = 'en';
const LANGUAGE_DIR_MAP = {
  he: 'rtl',
};

const cache = new Map();
let currentLanguage = FALLBACK_LANGUAGE;
let translations = {};
let fallbackTranslations = {};
const listeners = new Set();

function normalizeLanguage(lang) {
  if (!lang) return FALLBACK_LANGUAGE;
  const lower = String(lang).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lower) ? lower : FALLBACK_LANGUAGE;
}

async function loadLocale(locale) {
  const normalized = normalizeLanguage(locale);
  if (cache.has(normalized)) {
    return cache.get(normalized);
  }
  const response = await fetch(`./i18n/${normalized}.json`);
  if (!response.ok) {
    throw new Error(`Unable to load locale: ${normalized}`);
  }
  const data = await response.json();
  cache.set(normalized, data);
  return data;
}

function resolveKey(source, key) {
  if (!source || !key) return undefined;
  return key.split('.').reduce((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in acc) {
      return acc[segment];
    }
    return undefined;
  }, source);
}

function interpolate(template, params = {}) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{([^}]+)\}/g, (match, token) => {
    const key = token.trim();
    if (key && key in params) {
      return params[key];
    }
    return match;
  });
}

function updateDocumentLanguage(lang) {
  const html = document.documentElement;
  if (html) {
    html.lang = lang;
    const dir = LANGUAGE_DIR_MAP[lang] || 'ltr';
    html.dir = dir;
  }
}

function notify(language) {
  listeners.forEach((listener) => {
    try {
      listener(language);
    } catch (error) {
      console.error(error); // eslint-disable-line no-console
    }
  });
}

export function translate(key, params = {}) {
  const primary = resolveKey(translations, key);
  if (primary !== undefined) {
    return interpolate(primary, params);
  }
  const fallback = resolveKey(fallbackTranslations, key);
  if (fallback !== undefined) {
    return interpolate(fallback, params);
  }
  return key;
}

function setTextContent(node, value) {
  if (!node) return;
  const resolved = value != null ? String(value) : '';
  if (node.textContent !== resolved) {
    node.textContent = resolved;
  }
}

function applyAttributeTranslations(element) {
  if (!element || !element.dataset) return;
  Object.entries(element.dataset).forEach(([name, key]) => {
    if (!key) return;
    if (name === 'i18n') return;
    if (!name.startsWith('i18nAttr')) return;
    const attrName = name
      .slice('i18nAttr'.length)
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase();
    if (!attrName) return;
    const translated = translate(key);
    element.setAttribute(attrName, translated);
  });
}

export function applyTranslations(root = document) {
  const scope = root instanceof Element || root instanceof Document ? root : document;
  const elements = scope.querySelectorAll('[data-i18n]');
  elements.forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) return;
    const translated = translate(key);
    if (element instanceof HTMLButtonElement) {
      setTextContent(element, translated);
    } else if (element instanceof HTMLInputElement) {
      const type = element.type ? element.type.toLowerCase() : '';
      if (type === 'button' || type === 'submit' || type === 'reset') {
        element.value = translated;
      } else {
        element.setAttribute('value', translated);
      }
    } else if (element instanceof HTMLTextAreaElement) {
      element.value = translated;
    } else {
      setTextContent(element, translated);
    }
    applyAttributeTranslations(element);
  });
}

export function onLanguageChange(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrentLanguage() {
  return currentLanguage;
}

export async function setLanguage(language) {
  const next = normalizeLanguage(language);
  if (next === currentLanguage && translations) {
    return currentLanguage;
  }
  const localeData = await loadLocale(next);
  translations = localeData || {};
  currentLanguage = next;
  updateDocumentLanguage(currentLanguage);
  applyTranslations();
  notify(currentLanguage);
  return currentLanguage;
}

export async function initI18n(preferredLanguage = FALLBACK_LANGUAGE) {
  fallbackTranslations = await loadLocale(FALLBACK_LANGUAGE);
  try {
    await setLanguage(preferredLanguage);
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
    if (preferredLanguage !== FALLBACK_LANGUAGE) {
      await setLanguage(FALLBACK_LANGUAGE);
    }
  }
}
