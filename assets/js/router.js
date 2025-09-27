export function createRouter() {
  const routes = [];
  let notFoundHandler = null;

  function addRoute(pattern, handler) {
    routes.push({ pattern, handler });
  }

  function setNotFound(handler) {
    notFoundHandler = handler;
  }

  function parse(hash) {
    const cleanHash = hash.replace(/^#/, '') || '/';
    const [pathPart, queryString] = cleanHash.split('?');
    const segments = pathPart.split('/').filter(Boolean);
    const query = new URLSearchParams(queryString || '');
    return { segments, query, raw: cleanHash, path: `/${segments.join('/')}` || '/' };
  }

  function matchRoute(routePattern, segments) {
    const patternSegments = routePattern.split('/').filter(Boolean);
    if (patternSegments.length !== segments.length) {
      return null;
    }
    const params = {};
    for (let i = 0; i < patternSegments.length; i++) {
      const segment = patternSegments[i];
      if (segment.startsWith(':')) {
        params[segment.slice(1)] = decodeURIComponent(segments[i]);
      } else if (segment === segments[i]) {
        continue;
      } else {
        return null;
      }
    }
    return params;
  }

  function resolve() {
    const { segments, query, path } = parse(window.location.hash || '#/');
    for (const { pattern, handler } of routes) {
      const params = matchRoute(pattern, segments);
      if (params) {
        handler({ params, query, path: `/${segments.join('/')}` || '/' });
        return;
      }
    }
    if (notFoundHandler) {
      notFoundHandler({ path });
    }
  }

  function start() {
    window.addEventListener('hashchange', resolve, { passive: true });
    resolve();
  }

  return {
    addRoute,
    setNotFound,
    start,
    parse,
  };
}
