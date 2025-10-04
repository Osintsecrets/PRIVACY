# Social Risk Audit — Remediation Audit

## Summary of Actions

| Severity | Area | Description | Status |
| --- | --- | --- | --- |
| High | Architecture | Replaced single-page app with static multi-page layout for Home, Facebook, Ethics, and Why. | ✅ |
| High | Content | Rewrote guidance into concise checklists and plain-language rationale. | ✅ |
| High | Privacy | Removed data loaders, trackers, and external font dependencies. | ✅ |
| Medium | Accessibility | Added skip links, semantic landmarks, focus outlines, and large tap targets. | ✅ |
| Medium | Performance | Consolidated styles into one utility-first stylesheet and removed unused JavaScript. | ✅ |
| Low | PWA | Left dormant service worker/manifest for future use without automatic registration. | ✅ |

## Accessibility
- Navigation uses semantic landmarks, skip link, and `aria-current` for active pages.
- Buttons, links, and summaries retain visible focus via `:focus-visible` outlines.
- Collapsible Facebook tasks use native `<details>` to stay keyboard accessible without scripts.

## Privacy & Performance
- No external requests, fonts, analytics, or trackers.
- System font stack and high-contrast palette keep render fast and legible.
- Lightweight service worker and manifest retained but opt-in.

## Outstanding Ideas
1. Add reduced-motion toggle using `document.documentElement.dataset.rm` hook (CSS ready).
2. Provide downloadable checklist PDF for offline reference.
3. Expand platform coverage beyond Facebook when research is ready.

## Verification Checklist
| Requirement | Status |
| --- | --- |
| `/data` directory removed and references cleared | ✅ |
| Navigation works with `/PRIVACY/` base path | ✅ |
| Facebook page tasks expandable without JavaScript | ✅ |
| Contrast meets WCAG AA with off-white on dark background | ✅ |
| No third-party network requests detected | ✅ |

## 2025-10-04 Layering Spot Check
- Verified all public routes resolve with HTTP 200 responses from the static server.
- Ensured skip link now renders above sticky header content when focused (`z-index: 40`).
- Raised global/about back-to-top controls to `z-index: 60` to keep them above sticky nav and modal overlays.
- Confirmed disclaimer modal retains `z-index: 9999` and focus trap behavior; no changes required.
