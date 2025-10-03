(function(){
  const STORAGE_KEY = 'sra.language';
  const DEFAULT_LANGUAGE = 'en';
  const SUPPORTED_LANGUAGES = ['en', 'he'];
  const dictionaries = new Map();
  let currentLanguage = null;
  let baseUrl = null;

  function computeBaseUrl() {
    if (baseUrl) return baseUrl;
    try {
      const brand = document.querySelector('.brand');
      if (brand) {
        const href = brand.getAttribute('href') || brand.href || './';
        const url = new URL(href, window.location.href);
        baseUrl = url.href;
      }
    } catch (error) {
      baseUrl = null;
    }
    if (!baseUrl) {
      const url = new URL('./', window.location.href);
      baseUrl = url.href;
    }
    if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    return baseUrl;
  }

  function resolveKey(dictionary, path) {
    if (!dictionary || !path) return undefined;
    return path.split('.').reduce((value, segment) => (value && segment in value ? value[segment] : undefined), dictionary);
  }

  function parseArgs(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Invalid data-i18n-args payload', value, error);
      return null;
    }
  }

  function formatMessage(template, args) {
    if (typeof template !== 'string') return template;
    if (!args) return template;
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      if (key in args) return args[key];
      return match;
    });
  }

  function attributeNameFromDatasetKey(key) {
    const suffix = key.slice('i18nAttr'.length);
    if (!suffix) return null;
    return suffix
      .replace(/([A-Z])/g, '-$1')
      .replace(/^-/, '')
      .toLowerCase();
  }

  function applyTranslations(dictionary) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach((element) => {
      const key = element.dataset.i18n;
      const args = parseArgs(element.dataset.i18nArgs);
      const translation = resolveKey(dictionary, key);
      if (typeof translation === 'string') {
        element.textContent = formatMessage(translation, args);
      }
      Object.keys(element.dataset)
        .filter((datasetKey) => datasetKey.startsWith('i18nAttr') && datasetKey !== 'i18nAttrs')
        .forEach((datasetKey) => {
          const attrName = attributeNameFromDatasetKey(datasetKey);
          if (!attrName) return;
          const attrKey = element.dataset[datasetKey];
          const attrArgsKey = `${datasetKey}Args`;
          const attrArgs = element.dataset[attrArgsKey] ? parseArgs(element.dataset[attrArgsKey]) : args;
          const attrValue = resolveKey(dictionary, attrKey);
          if (typeof attrValue === 'string') {
            element.setAttribute(attrName, formatMessage(attrValue, attrArgs));
          }
        });
    });
  }

  function setDirection(language) {
    const html = document.documentElement;
    if (!html) return;
    const direction = language === 'he' ? 'rtl' : 'ltr';
    html.setAttribute('lang', language);
    html.setAttribute('dir', direction);
    if (document.body) {
      document.body.setAttribute('dir', direction);
    }
  }

  function updateLanguageControls(language) {
    const selects = document.querySelectorAll('.language-select');
    selects.forEach((select) => {
      if (select.value !== language) {
        select.value = language;
      }
    });
  }

  function persistLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      // Ignore storage failures (e.g., private mode)
    }
  }

  function notify(language) {
    document.dispatchEvent(new CustomEvent('i18n:change', { detail: { language } }));
  }

  function applyLanguage(language, dictionary) {
    if (!dictionary) return;
    currentLanguage = language;
    setDirection(language);
    applyTranslations(dictionary);
    updateLanguageControls(language);
    persistLanguage(language);
    notify(language);
  }

  async function loadDictionary(language) {
    if (dictionaries.has(language)) {
      return dictionaries.get(language);
    }
    const origin = computeBaseUrl();
    const url = new URL(`i18n/${language}.json`, origin);
    const response = await fetch(url.href, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Unable to load translations for ${language}`);
    }
    const data = await response.json();
    dictionaries.set(language, data);
    return data;
  }

  async function setLanguage(language) {
    let target = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
    try {
      const dictionary = await loadDictionary(target);
      applyLanguage(target, dictionary);
    } catch (error) {
      console.error(error);
      if (target !== DEFAULT_LANGUAGE) {
        try {
          const fallbackDictionary = await loadDictionary(DEFAULT_LANGUAGE);
          applyLanguage(DEFAULT_LANGUAGE, fallbackDictionary);
          return;
        } catch (fallbackError) {
          console.error(fallbackError);
        }
      }
    }
  }

  function detectPreferredLanguage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
        return stored;
      }
    } catch (error) {
      // Ignore storage failures
    }
    const html = document.documentElement;
    if (html) {
      const existing = html.getAttribute('lang');
      if (existing && SUPPORTED_LANGUAGES.includes(existing)) {
        return existing;
      }
    }
    if (navigator.languages) {
      for (const lang of navigator.languages) {
        const short = lang.slice(0, 2).toLowerCase();
        if (SUPPORTED_LANGUAGES.includes(short)) {
          return short;
        }
      }
    }
    return DEFAULT_LANGUAGE;
  }

  function handleLanguageChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (!target.classList.contains('language-select')) return;
    const nextLanguage = target.value;
    if (nextLanguage && nextLanguage !== currentLanguage) {
      setLanguage(nextLanguage);
    }
  }

  function init() {
    document.addEventListener('change', handleLanguageChange);
    const preferred = detectPreferredLanguage();
    setDirection(preferred);
    updateLanguageControls(preferred);
    setLanguage(preferred);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.I18n = {
    setLanguage,
    translate(key, args) {
      const dictionary = dictionaries.get(currentLanguage) || dictionaries.get(DEFAULT_LANGUAGE);
      const value = resolveKey(dictionary, key);
      if (typeof value === 'string') {
        return formatMessage(value, args);
      }
      return undefined;
    },
    get current() {
      return currentLanguage || DEFAULT_LANGUAGE;
    },
    get supported() {
      return [...SUPPORTED_LANGUAGES];
    },
  };
})();
