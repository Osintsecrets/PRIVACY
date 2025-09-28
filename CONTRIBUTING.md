# Contributing

Thanks for helping improve the Social Risk Audit project! This repo powers a public GitHub Pages deployment, so every commit should keep the site production-ready.

## Branches & PRs

- Create feature branches from `main` using the pattern `type/short-description` (e.g. `fix/offline-cache`).
- Keep pull requests focused and reference related Issues.
- Use the `feat`, `fix`, or `chore` labels depending on the change type.

## Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`…).
- Write clear, imperative commit messages describing the behavior change.

## Testing checklist

Before opening a PR:

- [ ] Load the site in a mobile viewport and desktop viewport.
- [ ] Toggle the reduced-motion setting and verify animations respect it.
- [ ] Confirm the disclaimer modal appears on every visit and is keyboard accessible.
- [ ] Run through a guide flow to ensure data renders and search works.
- [ ] Test the PWA install prompt and offline fallback when possible.

## Code style

- Prefer accessible, semantic HTML.
- Vanilla ES modules only; avoid bundlers.
- Keep the neon-cyan glass aesthetic and maintain WCAG AA contrast.
- Avoid third-party analytics, trackers, or remote scripts.

Thank you for supporting high-risk communities with safer defaults.
