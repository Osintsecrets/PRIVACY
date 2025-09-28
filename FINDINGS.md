# Social Risk Audit – Post-remediation Notes

## Overview
- Rebuilt the glassy app shell with safe-area padding and 44×44 touch targets for iOS/Android docks.
- Swapped the legacy guides implementation for a JSON-driven system (`data/guides.json`) with debounced search, level filters, aria-live result count, and a resumable wizard modal.
- Wired localisation via `i18n/{en,he}.json`; language choice persists and flips layout direction (`dir="rtl"`).
- Hardened onboarding with a scroll-gated disclaimer modal powered by the shared modal manager and inert background handling.
- Delivered a reduced-motion toggle that stores preference in `localStorage` and disables CSS/JS animations through `[data-rm="on"]` gating.
- Added a branded offline page, versioned service worker with precache/runtime caches, and an update toast hook.

## ✅ Working components
- **Routing & focus management** – Hash router swaps sections, toggles dock/nav state, and returns focus to the shell for screen readers.【F:assets/js/router.js†L4-L96】【F:assets/js/app.js†L86-L129】
- **Guides experience** – Fetches `data/guides.json`, renders filterable cards, exposes aria-live announcements, and runs a modal wizard with session-based progress resume.【F:assets/js/pages/guides.js†L1-L232】
- **i18n toggle** – `initI18n` loads bundles, updates `<html lang/dir>`, and re-renders DOM nodes on selection change.【F:assets/js/i18n.js†L1-L108】【F:assets/js/app.js†L182-L214】
- **Reduced motion** – Preference stored under `sra_rm`, applied via `documentElement.dataset.rm`, and enforced through CSS animation/transition guards.【F:assets/js/app.js†L25-L52】【F:assets/css/styles.css†L60-L97】
- **Disclaimer compliance** – Modal traps focus, keeps agree disabled until scrolled, and blocks ESC dismissal as required.【F:assets/js/disclaimer.js†L92-L210】
- **PWA pipeline** – Manifest uses `/PRIVACY/` scope, service worker precaches shell/data, serves offline fallback, and notifies clients of updates.【F:manifest.json†L1-L19】【F:sw.js†L1-L107】

## ⚠️ Outstanding / follow-up
- **Maskable icons** – Only square PNGs are referenced; need dedicated maskable artwork (192×192 & 512×512) for Android adaptive icons.
- **Manual QA** – Safe-area CSS implemented, but real device verification (iOS home indicator, Android gesture nav) is pending.
- **Update toast action** – SW posts `updateavailable`, app renders a reload button, but UX polish (auto-dismiss, styling) can improve.
- **CSP / security headers** – Still relying on GitHub Pages defaults; consider documenting a meta CSP snippet.

## Verification quicklist
| Area | Status | Notes |
| --- | --- | --- |
| Disclaimer modal | ✅ | Scroll-to-consent, focus trap, inert background.【F:assets/js/disclaimer.js†L92-L210】 |
| Tooltips | ✅ | Accessible hover/focus tooltips respect reduced motion.【F:assets/js/utils/tooltip.js†L1-L144】 |
| Guides search/filter | ✅ | Debounced search, keyboardable filters, aria-live count.【F:assets/js/pages/guides.js†L56-L151】 |
| Wizard resume | ✅ | Session storage persists `topicId -> stepIndex` and resume CTA exposed.【F:assets/js/pages/guides.js†L20-L54】【F:assets/js/pages/guides.js†L153-L205】 |
| Reduced motion | ✅ | `[data-rm="on"]` disables animations sitewide.【F:assets/css/styles.css†L60-L97】 |
| i18n toggle | ✅ | Language persisted via `localStorage`, `<html dir>` updated.【F:assets/js/app.js†L182-L214】 |
| Safe-area padding | ✅ | Body/header/dock use env() guards.【F:assets/css/styles.css†L28-L47】【F:assets/css/styles.css†L318-L356】 |
| PWA offline | ✅ | SW precache + offline fallback at `offline.html`.【F:sw.js†L1-L107】 |
| Install prompt | ✅ | `beforeinstallprompt` captured; button hints update.【F:assets/js/app.js†L138-L176】 |
| Update notification | ✅ | SW posts `updateavailable`; toast renders reload action.【F:sw.js†L38-L52】【F:assets/js/app.js†L154-L172】 |

