# Social Risk Audit — Repository Review

## Summary of Findings

| Severity | Area | File | Line(s) | Description | Status | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| High | PWA | sw.js | 1-142 | Service worker shipped as placeholder with no caching or offline support. | Fixed | Implemented versioned precache/runtime caches with offline fallback and client update messaging. |
| High | PWA | manifest.json | 1-26 | Manifest icons missing 192px variants causing install prompt failures on some devices. | Fixed | Added 192×192 entries pointing at existing artwork and clarified purposes. |
| Medium | Accessibility | assets/js/components.js | 118-135 | `mountToPortal` toggled `aria-hidden` on the portal container, hiding active dialogs from assistive tech. | Fixed | Removed automatic aria-hidden management; dialogs now declare semantics individually. |
| Medium | Documentation | README.md | 1-27 | README contained placeholder text, offering no setup or contribution guidance. | Fixed | Replaced with deployment, structure, and local dev instructions. |
| Low | Offline UX | offline.html | 1-36 | No branded offline fallback was provided, leading to browser error screens. | Fixed | Added neon glass-styled offline landing page with accessible controls. |
| Medium | Repo Hygiene | N/A | — | Missing contributing guide and `.gitignore`. | Fixed | Added contributing standards and ignored common OS/editor artifacts. |
| Medium | Assets | icons-s | — | No dedicated maskable icon assets beyond reused square art. | Open | Create purpose-built maskable PNGs sized 192×192 and 512×512; update manifest once available. |

## Accessibility

- **Portal visibility:** Removing the automatic `aria-hidden` toggling on `#ui-portal` ensures dialogs and popovers manage their own accessibility attributes without being hidden from assistive technology.【F:assets/js/components.js†L118-L135】
- **Focusable offline actions:** The offline fallback keeps interactive targets ≥44px with visible focus outlines, matching mobile accessibility guidance.【F:offline.html†L18-L35】
- **Outstanding:** Need a full sweep of color contrast for all focus states and dynamic overlays. Recommend using axe/Accessibility Insights in follow-up Issue.

## PWA

- **Caching strategy:** Added a versioned service worker that precaches the application shell, caches runtime requests, and responds with a branded offline page when navigation fails.【F:sw.js†L1-L141】
- **Update notifications:** Service worker now broadcasts `updateavailable` to prompt the in-app toast logic when a new version activates.【F:sw.js†L43-L57】
- **Manifest health:** Introduced 192×192 icons and clarified purposes to satisfy install criteria on Android and desktop Chromium.【F:manifest.json†L1-L26】
- **Outstanding:** Dedicated maskable icon assets are not yet available; filed as Issue for follow-up.

## Performance

- **Static precache:** Core CSS/JS/data assets precached during install to reduce repeat fetches and speed up navigation restores.【F:sw.js†L12-L33】
- **Runtime caching:** Implemented stale-while-revalidate logic for imagery/fonts/json to balance freshness and bandwidth.【F:sw.js†L79-L98】

## Mobile UX

- **Offline fallback:** Visitors now see a responsive, neon-themed offline card rather than the default browser error, preserving brand aesthetic.【F:offline.html†L1-L36】
- **Outstanding:** Need to validate safe-area spacing on a variety of iOS/Android devices—CSS guards exist but require device QA.

## SEO / Meta

- Existing metadata and Open Graph tags remain unchanged. Recommend future enhancement: add structured data for guides once schema stabilizes.

## Privacy / Security

- No trackers were introduced. Service worker caches only local assets and sanitizes errors. Continue monitoring for third-party script inclusion.

## Code Health

- Added README, CONTRIBUTING, and `.gitignore` to document workflows and prevent editor cruft from entering the repo.【F:README.md†L1-L27】【F:CONTRIBUTING.md†L1-L36】【F:.gitignore†L1-L11】
- Service worker cache version constant documented for future deployments.【F:sw.js†L1-L8】

## Content & i18n

- No text translations were altered. i18n bundles still need auditing for missing keys and Hebrew layout direction—recommend follow-up Issue.

## Deferred / Follow-up Issues

1. **`enhancement: Add dedicated maskable icons`** — Provide 192×192 and 512×512 maskable PNGs and update manifest accordingly.
2. **`a11y: Audit neon focus and contrast states`** — Run automated/manual accessibility testing to confirm all focus/hover states meet WCAG 2.2 AA.
3. **`pwa: Add in-app SW update toast UI`** — Expand on update messaging by wiring a visible reload prompt when `updateavailable` fires.
4. **`content: Expand guides schema coverage`** — Align `guides-facebook.json` with proposed schema and add cross-platform stubs.
