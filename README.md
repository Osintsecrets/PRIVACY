# Social Risk Audit

A stripped-back, utility-first privacy guide for the Platform checklist with ethics context and practical reasoning. The site is fully static and runs without trackers or third-party calls. Live at [https://osintsecrets.github.io/PRIVACY/](https://osintsecrets.github.io/PRIVACY/).

## Pages

- **Home** – mission statement, overview, and interactive self-audit checklists.
- **Platform** – expandable checklists for essential privacy tasks.
- **Ethics** – principles that guide how the material should be used.
- **Why** – rationale for caring about privacy in plain language.

## Project structure

```
.
├── index.html              # Home
├── platform.html           # Platform checklist
├── ethics.html             # Ethics statement
├── why.html                # Why privacy matters
├── assets/
│   ├── css/styles.css      # Single utility-first stylesheet
│   └── js/
│       ├── main.js         # Progressive enhancement for navigation state + SW registration
│       └── pledge-gate.js  # Shared pledge enforcement redirect
├── manifest.json           # Minimal PWA metadata (dormant)
├── sw.js                   # Offline cache shell (auto-registered)
└── offline.html            # Lightweight offline notice
```

## Local development

Serve the repo root with any static server to preview:

```bash
# Python 3
python -m http.server 8000
```

Then open [http://localhost:8000/index.html](http://localhost:8000/index.html). The service worker registers automatically on load and
resolves the correct scope for both local preview and the GitHub Pages `/PRIVACY/` base path. Registration successes and failures are
logged to the console for troubleshooting. The “Install App” button stays disabled until the browser fires `beforeinstallprompt`, at which
point it becomes interactive.

To verify the offline shell:

1. Visit the site in a browser and allow the initial load to complete (which installs the worker).
2. Stop the local server or toggle the browser's network inspector to “offline”.
3. Reload any page—navigation should fall back to `offline.html`.

## Automated audits

Run the Playwright-powered audit suite to exercise every public page at desktop and mobile breakpoints, confirm viewport/responsive metadata, and verify the navigation menu behaves on touch layouts:

```bash
npm install
npm test
```

> The tests start a temporary `python -m http.server` instance and rely on Chromium. If the bundled browser download is blocked on your network, manually provide a Chromium binary and re-run `npm test`.

## Accessibility & privacy

- System font stack, high-contrast palette, and consistent focus outlines.
- Skip link and semantic landmarks on every page.
- No analytics, no external fonts, no third-party network requests.

## Ethics pledge gate

All public-facing pages load a shared script that checks for a valid pledge token (`ETHICS_PLEDGE_TOKEN`) and matching `TERMS_VERSION` entry in `sessionStorage`. If a visitor has not completed the pledge—or an older pledge version is detected—they are redirected to `./pledge.html` on page load to review and accept the current terms before continuing. Inline pledge modals (such as the home page prompt) now seed the exact same structured payload in `sessionStorage`—and mirror it to `localStorage` for status badges—so both entry points stay in sync.

## Deployment

Push to `main`; GitHub Pages serves the site from `/PRIVACY/`. Verify that all links remain prefixed with `/PRIVACY/` so navigation works in production.
