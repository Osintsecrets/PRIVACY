# Social Risk Audit

A grandma-proof privacy companion for Facebook. The site runs entirely client-side, delivers an installable PWA, honours reduced-motion preferences, and works offline with an accessible fallback. Live at [https://osintsecrets.github.io/PRIVACY/](https://osintsecrets.github.io/PRIVACY/).

## Features

- **Guided fixes:** Searchable, filterable tasks backed by `data/guides.json`, complete with step-by-step wizard and session resume.
- **Ethics-first onboarding:** Mandatory scroll-to-consent disclaimer with focus trap and inert background every visit.
- **Accessibility:** Fully keyboard navigable, screen-reader friendly tooltips, 44×44 touch targets, RTL-safe English/Hebrew toggle that persists.
- **Comfort controls:** Global reduced-motion toggle stored in `localStorage` and enforced across CSS and JS.
- **Installable PWA:** Valid manifest, service worker precache/runtime caching, offline fallback shell, update notifications.
- **Mobile polish:** Safe-area aware layout for modern iOS/Android edge cases with glassy neon aesthetic.

## Project structure

```
.
├── index.html              # Application shell and layout
├── assets/
│   ├── css/styles.css      # Theme tokens, safe-area rules, glassmorphism styles
│   └── js/
│       ├── app.js          # Bootstraps router, i18n, settings, SW, tooltips
│       ├── pages/guides.js # Guides loader, filters, wizard
│       ├── disclaimer.js   # Scroll-to-agree modal logic
│       ├── router.js       # Hash router with ethics loader
│       ├── components.js   # Shared helpers (debounce, toasts, etc.)
│       └── utils/          # Modal manager, tooltip utilities
├── data/guides.json        # Task schema for the guides system
├── i18n/{en,he}.json       # Localised strings
├── manifest.json           # PWA metadata (start_url `/PRIVACY/`)
├── sw.js                   # Service worker with precache + offline fallback
└── offline.html            # Friendly offline landing page
```

## Local development

This repo is static; use any HTTP file server from the repository root:

```bash
# Python 3
python -m http.server 8000

# or Node.js
npx serve .
```

Then open [http://localhost:8000/index.html](http://localhost:8000/index.html). The service worker only registers on `http://localhost` or `https://`.

### Testing checklist

1. Load the site; confirm the disclaimer requires scrolling before the agree button enables.
2. Toggle reduced motion in **Settings** and ensure animations disappear (page reload not required).
3. Switch between English ↔ Hebrew; confirm layout flips and strings persist after reload.
4. Search and filter guides; confirm aria-live result count updates and the wizard resumes previous progress.
5. Install prompt: trigger via Chrome DevTools (“Before install prompt”) to verify the install button becomes active.
6. Go offline (DevTools → Offline); navigation should render `offline.html` fallback while existing pages use cache.

## Deployment

GitHub Pages serves `/PRIVACY` from `main`. After deploying, the service worker automatically notifies clients of updates via an in-app toast. If you change critical assets, bump `CACHE_VERSION` in `sw.js` to force refresh.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branching, commit style, and PR expectations.
