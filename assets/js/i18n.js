(function(){
  const DEFAULT_LANG = 'en';
  const SUPPORTED = new Set(['en', 'he']);
  const STORAGE_KEY = 'preferred-language';
  const callbacks = new Set();
  const cache = new Map();
  let currentLang = DEFAULT_LANG;
  let currentTranslations = {};

  function computeBasePrefix(customBase) {
    if (typeof window === 'undefined') return customBase || './';
    if (customBase) return customBase;
    const pathname = window.location.pathname || '';
    const anchor = '/PRIVACY/';
    const anchorIndex = pathname.indexOf(anchor);
    if (anchorIndex === -1) {
      return './';
    }
    const afterAnchor = pathname.slice(anchorIndex + anchor.length);
    if (!afterAnchor) {
      return './';
    }
    const segments = afterAnchor.split('/').filter(Boolean);
    const isDirectory = pathname.endsWith('/');
    const depth = Math.max(0, segments.length - (isDirectory ? 0 : 1));
    if (depth === 0) {
      return './';
    }
    return '../'.repeat(depth);
  }

  function resolveTranslation(source, path) {
    if (!source) return undefined;
    return path.split('.').reduce((acc, key) => {
      if (acc && Object.prototype.hasOwnProperty.call(acc, key)) {
        return acc[key];
      }
      return undefined;
    }, source);
  }

  function applyTranslations(map) {
    if (typeof document === 'undefined') return;
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach((element) => {
      const key = element.getAttribute('data-i18n');
      if (!key) return;
      const value = resolveTranslation(map, key);
      if (value == null) return;
      const attrTarget = element.getAttribute('data-i18n-attr');
      if (attrTarget) {
        if (attrTarget === 'html') {
          element.innerHTML = value;
        } else if (attrTarget === 'value') {
          element.value = value;
        } else {
          element.setAttribute(attrTarget, value);
        }
        return;
      }
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = value;
      } else {
        element.textContent = value;
      }
    });
  }

  function setDocumentLanguage(lang) {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    if (!html) return;
    html.lang = lang;
    html.dir = lang === 'he' ? 'rtl' : 'ltr';
    if (typeof document.body !== 'undefined' && document.body) {
      document.body.dataset.dir = html.dir;
    }
  }

  async function fetchTranslations(lang) {
    if (cache.has(lang)) {
      return cache.get(lang);
    }
    const prefix = computeBasePrefix();
    const url = `${prefix}i18n/${lang}.json`;
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error(`Unable to load ${lang} translations`);
    }
    const data = await response.json();
    cache.set(lang, data);
    return data;
  }

  function storePreference(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      console.warn('Unable to persist language preference', error);
    }
  }

  function getStoredPreference() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.has(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn('Unable to read language preference', error);
    }
    return null;
  }

  async function setLanguage(lang, { persist = true } = {}) {
    const requested = SUPPORTED.has(lang) ? lang : DEFAULT_LANG;
    let translations;
    try {
      translations = await fetchTranslations(requested);
    } catch (error) {
      if (requested !== DEFAULT_LANG) {
        console.warn(`Falling back to ${DEFAULT_LANG} after failing to load ${requested}`, error);
        translations = await fetchTranslations(DEFAULT_LANG);
        lang = DEFAULT_LANG;
      } else {
        console.error('Unable to load translations', error);
        return;
      }
    }
    currentLang = requested;
    currentTranslations = translations;
    applyTranslations(translations);
    setDocumentLanguage(requested);
    callbacks.forEach((cb) => {
      try {
        cb(requested, translations);
      } catch (error) {
        console.error('i18n callback error', error);
      }
    });
    if (persist) {
      storePreference(requested);
    }
    window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: requested, translations } }));
  }

  function detectInitialLanguage() {
    const stored = typeof window !== 'undefined' ? getStoredPreference() : null;
    if (stored) return stored;
    if (typeof document !== 'undefined' && document.documentElement && SUPPORTED.has(document.documentElement.lang)) {
      return document.documentElement.lang;
    }
    if (typeof navigator !== 'undefined') {
      const languages = Array.isArray(navigator.languages) ? navigator.languages : [navigator.language];
      for (const candidate of languages) {
        if (!candidate) continue;
        const code = candidate.toLowerCase().split('-')[0];
        if (SUPPORTED.has(code)) {
          return code;
        }
      }
    }
    return DEFAULT_LANG;
  }

  function ready(callback) {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function initialize() {
    const select = document.getElementById('lang');
    const initialLang = detectInitialLanguage();
    setLanguage(initialLang, { persist: false }).then(() => {
      if (select) {
        select.value = initialLang;
      }
    });
    if (select) {
      select.addEventListener('change', (event) => {
        const nextLang = event.target.value;
        setLanguage(nextLang);
      });
    }
  }

  const api = {
    get lang() {
      return currentLang;
    },
    t(key) {
      const translation = resolveTranslation(currentTranslations, key);
      if (translation != null) {
        return translation;
      }
      return key;
    },
    onChange(callback) {
      if (typeof callback !== 'function') return () => {};
      callbacks.add(callback);
      try {
        callback(currentLang, currentTranslations);
      } catch (error) {
        console.error('i18n callback error', error);
      }
      return () => callbacks.delete(callback);
    }
  };

  if (typeof window !== 'undefined') {
    window.I18N = api;
  }

  ready(initialize);
})();
