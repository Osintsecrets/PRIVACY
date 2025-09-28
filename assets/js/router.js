import { renderEthics } from './pages/ethics.js';

export function createRouter() {
  const routes = [];
  let notFoundHandler = null;
  let currentRoute = null;
  let suppressNext = false;

  function addRoute(pattern, handler) {
    routes.push({ pattern, handler });
  }

  function setNotFound(handler) {
    notFoundHandler = handler;
  }

  function parse(hash) {
    const value = (typeof hash === 'string' && hash.length ? hash : window.location.hash || '#/') || '#/';
    const cleanHash = value.replace(/^#/, '') || '/';
    const [pathPart = '', queryString = ''] = cleanHash.split('?');
    const segments = pathPart
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
    const query = new URLSearchParams(queryString);
    const path = segments.length ? `/${segments.join('/')}` : '/';
    return { segments, query, raw: cleanHash, path };
  }

  function matchRoute(routePattern, segments) {
    const patternSegments = routePattern.split('/').filter(Boolean);
    if (patternSegments.length !== segments.length) {
      return null;
    }
    const params = {};
    for (let i = 0; i < patternSegments.length; i += 1) {
      const segment = patternSegments[i];
      if (segment.startsWith(':')) {
        params[segment.slice(1)] = segments[i];
      } else if (segment === segments[i]) {
        continue; // eslint-disable-line no-continue
      } else {
        return null;
      }
    }
    return params;
  }

  function resolve(forcedHash) {
    currentRoute = parse(forcedHash);
    const { segments, query, path, raw } = currentRoute;
    for (const { pattern, handler } of routes) {
      const params = matchRoute(pattern, segments);
      if (params) {
        handler({ params, query, path, raw });
        return currentRoute;
      }
    }
    if (typeof notFoundHandler === 'function') {
      notFoundHandler({ path, raw, query });
    }
    return currentRoute;
  }

  function onHashChange() {
    if (suppressNext) {
      suppressNext = false;
      currentRoute = parse();
      return;
    }
    resolve();
  }

  function normalize(targetPath) {
    if (!targetPath) {
      return '#/';
    }
    let hash = String(targetPath).trim();
    if (!hash.startsWith('#')) {
      hash = `#${hash.replace(/^#/, '')}`;
    }
    const after = hash.slice(1);
    if (!after.startsWith('/')) {
      hash = `#/${after}`;
    }
    return hash || '#/';
  }

  function navigate(path, { replace = false, silent = false } = {}) {
    const hash = normalize(path);
    if (replace) {
      const url = `${window.location.pathname}${window.location.search}${hash}`;
      window.history.replaceState(null, '', url);
      currentRoute = parse(hash);
      if (!silent) {
        resolve(hash);
      }
      return;
    }
    const currentHash = window.location.hash || '#';
    if (currentHash === hash) {
      if (silent) {
        currentRoute = parse(hash);
        return;
      }
      resolve(hash);
      return;
    }
    suppressNext = Boolean(silent);
    window.location.hash = hash;
  }

  function start() {
    window.addEventListener('hashchange', onHashChange, { passive: true });
    resolve();
  }

  function getCurrent() {
    if (!currentRoute) {
      currentRoute = parse();
    }
    return currentRoute;
  }

  return {
    addRoute,
    setNotFound,
    start,
    parse,
    navigate,
    getCurrent,
  };
}

export async function handleEthicsRoute(root) {
  document.title = 'Ethics — Social Risk Audit';
  await renderEthics(root);
}
