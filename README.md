# Social Risk Audit

A mobile-first privacy and safety toolkit targeting high-risk Facebook users. The site is shipped as a static Progressive Web App (PWA) hosted on GitHub Pages at [https://osintsecrets.github.io/PRIVACY/](https://osintsecrets.github.io/PRIVACY/).

## Local development

This project is completely static. To preview locally you can run any static file server from the repository root:

```bash
# Using Python 3
python -m http.server 8000
# Or using Node's serve
npx serve .
```

Then open [http://localhost:8000/index.html](http://localhost:8000/index.html) in your browser. The service worker only registers over `http://localhost` or `https`.

## Structure

- `index.html` — main application shell.
- `assets/css/styles.css` — glassmorphism-inspired design system.
- `assets/js/` — modular vanilla JS application (router, guides, components, utilities).
- `data/` — JSON/Markdown data sources for guides and content.
- `i18n/` — localization bundles (English and Hebrew).
- `sw.js` — offline cache controller.
- `manifest.json` — PWA manifest metadata.
- `offline.html` — offline fallback page for navigation requests.

## Deployment

GitHub Pages serves the `/PRIVACY` directory automatically from the `main` branch. After pushing changes, invalidate the existing service worker by bumping `CACHE_VERSION` in `sw.js` when assets change.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for commit style and workflow conventions.
