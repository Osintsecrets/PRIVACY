# Contributing

Thanks for helping improve the Social Risk Audit project! This repo powers a public GitHub Pages deployment, so every commit must keep the site production-ready.

## Branching & Pull Requests

- Create feature branches from `main` using the pattern `type/short-description` (for example `feat/guides-wizard`).
- Keep pull requests atomic; link any related issues in the PR description.
- Use the `feat`, `fix`, `chore`, or `content` labels depending on the change type.
- Update `AUDIT.md` when you complete a feature-sized change so we can track remediation history.

## Commit style

- Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:` …).
- Write clear, imperative messages that describe the behavior change rather than the code change.

## Pre-merge checklist

Before you open a PR, double-check:

- [ ] Load the site on desktop **and** mobile viewports; no console errors.
- [ ] Disclaimer modal appears on refresh, traps focus, and requires scroll-to-consent.
- [ ] Reduced-motion toggle updates animations instantly and persists after reload.
- [ ] Guides search + level filters announce result counts (`aria-live`) and the wizard resumes progress.
- [ ] i18n toggle flips the interface to RTL safely and persists between visits.
- [ ] Service worker is registered, install prompt works (use Chrome DevTools → “Before install prompt”), and offline navigation shows `offline.html`.
- [ ] Safe-area insets keep the floating dock and header away from iOS/Android system UI.

## Code style guidelines

- Prefer accessible, semantic HTML with explicit aria attributes.
- Vanilla ES modules only; avoid bundlers or heavyweight frameworks.
- Preserve the glassy black + neon cyan aesthetic while meeting WCAG AA contrast.
- Do not add trackers, analytics, or remote scripts.
- Bump the `CACHE_VERSION` constant in `sw.js` when changing any precached assets.

Thank you for supporting high-risk communities with safer defaults.
