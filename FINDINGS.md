# Social Risk Audit – Code & Functionality Audit

## Overview
- Reviewed the full repository structure, HTML, CSS, JS modules, JSON content, manifest, and service worker files.
- Attempted to load https://osintsecrets.github.io/PRIVACY/ in the execution environment; GitHub Pages returned HTTP 403 via the proxy so live verification (desktop/mobile, share previews) could not be completed. 【33fcc7†L1-L9】

## ✅ Working components
- **Client-side routing and focus management** – `createRouter` integrates with view activation and focus reset on the shell, keeping navigation keyboard-friendly. 【F:assets/js/router.js†L4-L101】【F:assets/js/app.js†L55-L75】
- **Guides index, filtering, and wizard** – The guides module builds the search UI, category chips with roving tabindex, and a modal wizard that keeps URL step parameters in sync. 【F:assets/js/guides.js†L93-L158】【F:assets/js/guides.js†L320-L405】
- **Search debounce and Escape-to-clear** – Search inputs debounce user typing and allow fast clearing, preventing excessive filtering work. 【F:assets/js/components.js†L5-L48】
- **Reduced-motion preference** – Preference is persisted in `localStorage`, toggles a body class, and CSS honors it with motion overrides. 【F:assets/js/app.js†L31-L52】【F:assets/js/app.js†L146-L151】【F:assets/css/styles.css†L824-L845】【F:assets/css/styles.css†L940-L946】
- **Layering system** – Global z-index tokens keep tooltips, modals, and the legal disclaimer in the intended order. 【F:assets/css/styles.css†L949-L1000】
- **Ethics page rendering** – Markdown is fetched, transformed into headings/lists, and focus is sent to the heading for accessibility. 【F:assets/js/pages/ethics.js†L1-L107】
- **Offline indicator and connectivity hooks** – Online/offline events update the settings view indicator. 【F:assets/js/app.js†L202-L209】
- **Safe-area aware layout and keyboardable dock** – The app shell pads for mobile safe areas and dock buttons expose focus styles. 【F:assets/css/styles.css†L35-L85】【F:assets/css/styles.css†L985-L987】

## ❌ Critical blockers
- **Language toggle is non-functional** – Changing the select only stores the preference and shows a toast; no translation layer consumes the `i18n` JSON, leaving all UI English-only. 【F:assets/js/app.js†L135-L144】【F:i18n/en.json†L1-L38】
- **PWA offline support absent** – The service worker is registered, but `sw.js` has no fetch handler or caching, so the app cannot load offline despite the install surface. 【F:assets/js/app.js†L167-L199】【F:sw.js†L1-L13】
- **Update toast dead code** – The app listens for a `message` of type `updateavailable`, yet the service worker never posts such a message, so users will never be notified about updates. 【F:assets/js/app.js†L193-L197】【F:sw.js†L1-L13】
- **Manifest lacks required icon sizes** – Only 512×512 icons are declared; many browsers require 192×192 or 256×256 for install prompts, risking a rejected PWA install. 【F:manifest.json†L9-L22】

## ⚠️ Warnings & improvements
- **Disclaimer gate lacks persistence** – The overlay reappears on every load and does not store acceptance, which may frustrate returning users. 【F:assets/js/disclaimer.js†L233-L254】
- **“I Do Not Agree” flow strands users** – Clicking it merely reveals a link to `about:blank`, without closing the overlay or navigating away. 【F:index.html†L180-L183】【F:assets/js/disclaimer.js†L191-L205】
- **Popover accessibility gaps** – `createPopover` sets `role="dialog"` but provides no focus trap or labelled-by wiring, risking focus escape when using keyboard/screen readers. 【F:assets/js/components.js†L461-L506】
- **SEO/share metadata minimal** – No canonical URL or social-specific image (OG/Twitter reuse the 512px app icon), which can lead to poor link previews. 【F:index.html†L8-L24】【F:manifest.json†L9-L21】
- **JSON version metadata unused** – `data/*` files expose version/updated fields but nothing validates or surfaces them to users. 【F:data/guides-facebook.json†L1-L13】【F:data/platforms.json†L1-L8】
- **No Content Security Policy** – Static HTML lacks a CSP header/meta, so hardening against script injection is pending.
- **Performance instrumentation absent** – No tooling (Lighthouse, Web Vitals, bundle analysis) is wired in to monitor LCP/CLS/INP or JS payload size.
- **Live site verification blocked** – Proxy returned HTTP 403, so deployed behavior (install prompts, share previews, responsive layout) couldn’t be confirmed in this environment. 【33fcc7†L1-L9】

## 📈 Suggested fixes or enhancements
1. Integrate the `i18n` JSON by wiring a translation loader that updates DOM nodes with `data-i18n`, and reload text on language changes.
2. Implement service worker precaching (Workbox or manual `caches.open`) plus an offline fallback page to satisfy PWA expectations.
3. Emit update notifications from the service worker (`self.skipWaiting()` + `clients.matchAll()` + `postMessage`) so the existing toast can surface upgrades.
4. Add 192×192 and 256×256 icons to the manifest and supply a 1200×630 OG image for rich previews.
5. Persist disclaimer acceptance (e.g., `localStorage`) and make the “Leave site” action redirect to a meaningful destination while closing the modal.
6. Enhance popovers with labelled-by hooks and a basic focus trap, or convert them to non-modal tooltips.
7. Surface data version info in the UI or validations to guarantee users load the expected schema version.
8. Publish a `meta http-equiv="Content-Security-Policy"` baseline (self-only) for GitHub Pages deployment.

## 📋 Checklist
| Feature / area | Status | Notes |
| --- | --- | --- |
| PWA manifest & icons | ⚠️ Fail | Missing 192/256px icons; start URL is hash-based but acceptable. 【F:manifest.json†L4-L21】 |
| Service worker caching/offline | ❌ Fail | No fetch handler or caching logic. 【F:sw.js†L3-L13】 |
| PWA install flow | ⚠️ Partial | Install button listens for `beforeinstallprompt`, but missing icons/offline may block actual install. 【F:assets/js/app.js†L153-L177】【F:manifest.json†L9-L21】 |
| Update flow | ❌ Fail | App listens for worker messages, but worker never emits updates. 【F:assets/js/app.js†L193-L197】【F:sw.js†L3-L13】 |
| Layering & z-index | ✅ Pass | Layer scale defined for overlays, tooltips, disclaimers. 【F:assets/css/styles.css†L949-L1000】 |
| Navigation & routing | ✅ Pass | Hash router switches views and updates focus/dock state. 【F:assets/js/router.js†L4-L101】【F:assets/js/app.js†L55-L108】 |
| Language toggle / i18n | ❌ Fail | Preference stored but UI text never changes. 【F:assets/js/app.js†L135-L144】【F:i18n/en.json†L1-L38】 |
| Accessibility (focus, keyboard) | ⚠️ Partial | Views refocus root and chips use roving tabindex, but popovers lack focus trap/labels. 【F:assets/js/app.js†L55-L65】【F:assets/js/guides.js†L138-L143】【F:assets/js/components.js†L461-L506】 |
| Reduced-motion toggle | ✅ Pass | Body class plus CSS overrides respect preference. 【F:assets/js/app.js†L146-L151】【F:assets/css/styles.css†L824-L845】 |
| Disclaimer scroll-to-agree | ⚠️ Partial | Scroll gating works but acceptance isn’t persisted and disagree flow stalls. 【F:assets/js/disclaimer.js†L168-L205】 |
| Guide wizard | ✅ Pass | Modal syncs steps with URL and disables prev/next appropriately. 【F:assets/js/guides.js†L352-L439】 |
| Ethics page | ✅ Pass | Fetches markdown and renders semantic content with error fallback. 【F:assets/js/pages/ethics.js†L70-L107】 |
| Fetch/error handling | ⚠️ Partial | Platforms fetch has toast fallback; service worker & ethics lack retry/backoff. 【F:assets/js/app.js†L78-L89】【F:assets/js/pages/ethics.js†L78-L104】 |
| Search/filter debounce | ✅ Pass | Debounced input & Escape handling implemented. 【F:assets/js/components.js†L5-L48】 |
| Security/privacy | ⚠️ Partial | No third-party trackers, but CSP missing. 【F:index.html†L8-L24】 |
| Mobile safe-area & dock | ✅ Pass | Safe-area padding and fixed dock rules in CSS. 【F:assets/css/styles.css†L35-L40】【F:assets/css/styles.css†L985-L987】 |
| LocalStorage persistence | ✅ Pass | Language and reduced-motion preferences saved/restored. 【F:assets/js/app.js†L31-L52】【F:assets/js/app.js†L135-L151】 |
| Fallback pages | ⚠️ Partial | GH 404 exists, but router’s not-found silently returns home. 【F:404.html†L1-L14】【F:assets/js/router.js†L88-L101】 |
| Performance metrics/JS size | ❌ Fail | No analytics, Lighthouse config, or bundle tooling present. |
| Live deployment parity | ⚠️ Unknown | Proxy blocked direct testing of GitHub Pages build. 【33fcc7†L1-L9】 |
| SEO & share preview | ⚠️ Partial | Basic meta tags present, but no canonical URL and OG image is just the app icon. 【F:index.html†L8-L24】 |
| JSON schema/versioning | ⚠️ Partial | Version fields exist but never validated or surfaced. 【F:data/guides-facebook.json†L1-L13】 |

## Live deployment cross-check
- Could not validate the GitHub Pages deployment (desktop/mobile, install prompts, share previews) because the proxy returned HTTP 403. Recommend manual verification outside the restricted environment. 【33fcc7†L1-L9】

