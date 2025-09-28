# Social Risk Audit — Remediation Audit

## Summary of Actions

| Severity | Area | File | Line(s) | Description | Status | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| High | Modal accessibility | assets/js/disclaimer.js | 85-214 | Disclaimer rebuilt with modal manager, scroll-gate, and ESC lock per requirements.【F:assets/js/disclaimer.js†L85-L214】 | ✅ Fixed | — |
| High | Guides UX | assets/js/pages/guides.js | 14-477 | New JSON-driven guides loader with search, filters, wizard, and session resume.【F:assets/js/pages/guides.js†L14-L477】 | ✅ Fixed | — |
| High | Reduced motion | assets/js/app.js<br>assets/css/tokens.css | 55-100<br>45-72 | Preference now stored under `sra_rm`, applied via `<html data-rm>`, and CSS/JS guard animations.【F:assets/js/app.js†L55-L100】【F:assets/css/tokens.css†L45-L72】 | ✅ Fixed | — |
| High | PWA caching | sw.js | 1-133 | Versioned precache/runtime caches with offline fallback and update broadcast.【F:sw.js†L1-L133】 | ✅ Fixed | — |
| Medium | Safe-area layout | assets/css/tokens.css<br>assets/css/components.css | 1-44<br>1-88 | Header/body/dock honour iOS/Android safe areas and maintain 44×44 tap targets.【F:assets/css/tokens.css†L25-L44】【F:assets/css/components.css†L1-L88】 | ✅ Fixed | — |
| Medium | i18n | assets/js/app.js<br>i18n/{en,he}.json | 182-214<br>1-103 | Language toggle persists, flips `dir`, and re-renders strings.【F:assets/js/app.js†L182-L214】【F:i18n/en.json†L1-L103】【F:i18n/he.json†L1-L103】 | ✅ Fixed | — |
| Medium | Manual experience | assets/js/pages/manual.js<br>index.html | 1-240<br>1-120 | Added long-form manual route that renders audit narrative and guides dataset.【F:assets/js/pages/manual.js†L1-L240】【F:index.html†L52-L94】 | ✅ Fixed | — |
| Low | Maskable icon coverage | manifest.json | 1-24 | Manifest still references square icons only.【F:manifest.json†L1-L24】 | ⚠️ Open | Create maskable 192/512px art and update manifest `purpose: "any maskable"`. |
| Low | Security headers | index.html | 4-20 | No CSP meta yet; add documentation for downstream hardening.【F:index.html†L4-L19】 | ⚠️ Open | Document CSP snippet for GitHub Pages deployment. |

## Accessibility
- Tooltips now use a shared utility that respects the reduced-motion flag and attaches `aria-describedby` only while visible.【F:assets/js/utils/tooltip.js†L1-L172】
- Modal manager sets `inert` on background containers without forcefully toggling `aria-hidden`, preserving assistive tech visibility.【F:assets/js/utils/modal.js†L1-L124】
- Guides result counts announce via a dedicated `aria-live` region and resume button exposes stored progress for keyboard users.【F:assets/js/pages/guides.js†L140-L205】
- Outstanding: create maskable icons (visual) and run full contrast audit with tools like axe or Accessibility Insights.

## Progressive Web App
- Manifest updated with `/PRIVACY/` scope/start URL, consistent theme colours, and install copy.【F:manifest.json†L1-L24】
- Service worker precaches shell assets/data, applies stale-while-revalidate for JSON/media, and replies with `offline.html` during outages.【F:sw.js†L1-L125】
- Clients receive `updateavailable` messages; app renders reload CTA so updates are discoverable.【F:sw.js†L38-L55】【F:assets/js/app.js†L142-L178】
- Outstanding: ship maskable icons for adaptive installs.

## Guides System
- `data/guides.json` defines version/platform metadata and four Facebook tasks with steps, notes, levels, and tags.【F:data/guides.json†L1-L66】
- UI renders filter chips (`basic/intermediate/advanced`), debounced search, and aria-live result announcement.【F:assets/js/pages/guides.js†L266-L306】【F:assets/js/pages/guides.js†L140-L161】
- Wizard modal stores per-guide progress in `sessionStorage` to offer a single-click resume entry point.【F:assets/js/pages/guides.js†L322-L414】【F:assets/js/pages/guides.js†L35-L90】
- New manual view merges `data/manual.en.json` metadata with `data/guides-facebook.json` tasks to provide a narrative companion.【F:assets/js/pages/manual.js†L1-L240】【F:data/manual.en.json†L1-L66】【F:data/guides-facebook.json†L1-L220】

## Mobile & Layout
- Body/header/dock apply `env(safe-area-inset-*)` padding and keep floating dock above gesture home indicator.【F:assets/css/tokens.css†L25-L44】【F:assets/css/components.css†L1-L88】
- Buttons and chips enforce `min-height: 44px` and neon focus outlines for touch compliance.【F:assets/css/components.css†L140-L209】
- Offline fallback styled to match glassmorphism theme with accessible refresh button.【F:offline.html†L1-L40】

## Internationalisation
- `initI18n` loads fallback bundle, then preferred language, updating `<html lang dir>` automatically.【F:assets/js/i18n.js†L1-L108】【F:assets/js/app.js†L182-L214】
- Language switcher persists choice, shows toast, and rerenders DOM nodes via `applyTranslations`.【F:assets/js/app.js†L182-L214】
- Hebrew bundle mirrors all new guide strings; layout flips RTL safely with existing CSS grid/flex layouts.【F:i18n/he.json†L1-L103】

## Outstanding Issues to File
1. **Maskable icons for PWA install (pwa, enhancement)** — Generate 192×192 and 512×512 maskable PNGs, reference them with `purpose: "any maskable"` in `manifest.json`, and re-run install tests.
2. **Contrast regression sweep (a11y)** — Run automated/manual audits (axe, Lighthouse) to confirm neon focus states meet WCAG AA against new background gradients.
3. **Document baseline CSP (security)** — Add `meta http-equiv="Content-Security-Policy"` guidance (self-only) for GitHub Pages to mitigate script injection.
4. **Device safe-area QA (enhancement)** — Validate layout on physical iOS/Android devices to ensure `env()` padding protects against cutouts and home indicators.

## Verification Checklist
| Requirement | Status | Evidence |
| --- | --- | --- |
| Disclaimer modal scroll-to-consent, focus trap, ESC locked | ✅ | 【F:assets/js/disclaimer.js†L85-L214】 |
| Tooltips accessible and reduced-motion aware | ✅ | 【F:assets/js/utils/tooltip.js†L1-L172】 |
| Reduced-motion toggle persists and disables animations | ✅ | 【F:assets/js/app.js†L55-L100】【F:assets/css/tokens.css†L45-L72】 |
| Safe-area padding keeps dock/header clear on mobile | ✅ | 【F:assets/css/tokens.css†L25-L44】【F:assets/css/components.css†L1-L88】 |
| PWA manifest valid, icons load, install prompt surfaces | ✅ | 【F:manifest.json†L1-L24】【F:assets/js/app.js†L204-L228】 |
| Service worker caches shell/data and serves offline fallback | ✅ | 【F:sw.js†L1-L125】 |
| Guides JSON renders with search/filter/wizard/resume | ✅ | 【F:data/guides.json†L1-L66】【F:assets/js/pages/guides.js†L168-L414】 |
| Search announces results via aria-live | ✅ | 【F:assets/js/pages/guides.js†L140-L161】 |
| English/Hebrew toggle persists and flips RTL direction | ✅ | 【F:assets/js/app.js†L182-L214】【F:i18n/he.json†L1-L103】 |
