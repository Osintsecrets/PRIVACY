# Social Risk Audit

A stripped-back, utility-first privacy guide for Facebook with ethics context and practical reasoning. The site is fully static and runs without trackers or third-party calls. Live at [https://osintsecrets.github.io/PRIVACY/](https://osintsecrets.github.io/PRIVACY/).

## Pages

- **Home** – mission statement, overview, and quick links to core content.
- **Facebook** – expandable checklists for essential Facebook privacy tasks.
- **Ethics** – principles that guide how the material should be used.
- **Why** – rationale for caring about privacy in plain language.

## Project structure

```
.
├── index.html              # Home
├── facebook.html           # Facebook checklist
├── ethics.html             # Ethics statement
├── why.html                # Why privacy matters
├── assets/
│   ├── css/styles.css      # Single utility-first stylesheet
│   └── js/main.js          # Progressive enhancement for navigation state
├── manifest.json           # Minimal PWA metadata (dormant)
├── sw.js                   # Offline cache shell (not registered by default)
└── offline.html            # Lightweight offline notice
```

## Local development

Serve the repo root with any static server to preview:

```bash
# Python 3
python -m http.server 8000
```

Then open [http://localhost:8000/index.html](http://localhost:8000/index.html). The service worker will only activate if you register it manually during testing.

## Accessibility & privacy

- System font stack, high-contrast palette, and consistent focus outlines.
- Skip link and semantic landmarks on every page.
- No analytics, no external fonts, no third-party network requests.

## Deployment

Push to `main`; GitHub Pages serves the site from `/PRIVACY/`. Verify that all links remain prefixed with `/PRIVACY/` so navigation works in production.
