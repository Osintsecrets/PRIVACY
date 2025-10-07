# Codex Master Instruction Spec — Platform Privacy Guides (Auto-Generate at Scale)

**Goal:** From a simple list of action titles per platform (TikTok, X/Twitter, WhatsApp, Telegram, and future platforms), Codex will automatically generate **complete, step-by-step guides** (Web → Android → iOS) in your site’s existing structure, with clean search keywords and consistent markup.

You (or future you) will paste: (1) this spec, and (2) a plain list of action titles. Codex should do the rest.

---

## 0) Global Rules (apply to *every* guide)

* **Tone:** plain, literal, click-by-click, suitable for a non-technical user. **No explanations** or “why it matters.” Only steps.
* **Order of sections:** **Web (browser)** first → **Android app** → **iOS app**.
* **Menu names:** Always use **“Settings and privacy”** exactly (not “&”). Use **≡** for the hamburger and **⋯** for overflow.
* **If a platform doesn’t support a path:** write a short line: *“(Not available on Web)”* (or Android/iOS as appropriate).
* **Destructive actions:** always end with a **Confirm** step (e.g., *Confirm by tapping **Delete***).
* **Searchability:** include synonyms in `data-keywords` (e.g., `read receipts, seen, dm requests`).
* **Accessibility:** use ordered steps (`<ol>`) inside each platform’s `<details>` block.

---

## 1) Files Codex will create/update

* **New platform pages:** `platforms/<platform>.html` (e.g., `platforms/tiktok.html`).
* **Index page updates:** `platform.html` (platform grid): add card for each new platform.
* **Navigation:** ensure the new platform is linked in any nav menus.
* **Search:** no code changes required beyond data attributes; Codex must populate `data-keywords`.
* **Translations:** if any static copy is added (like banners), add keys to `assets/i18n/en.json` and `assets/i18n/he.json` (English text can be duplicated into Hebrew temporarily if translation isn’t provided).

> Do **not** modify service worker or offline logic.

---

## 2) Page Skeleton (clone of Facebook/Instagram style)

For each platform page, Codex must generate this skeleton and then insert guide cards into the main content area.

```html
<!-- platforms/<platform>.html -->
<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><PLATFORM> Privacy & Security Guides</title>
  <link rel="stylesheet" href="../assets/css/main.css">
</head>
<body class="theme-dark">
  <header class="site-header">
    <a href="../index.html" class="logo">Social Risk Audit</a>
    <nav class="site-nav">
      <a href="../index.html">Home</a>
      <a href="../self-audit.html">Self‑audit</a>
      <a href="../platform.html" aria-current="page">Platform</a>
      <a href="../about/index.html">About</a>
    </nav>
  </header>

  <main class="container">
    <h1 class="page-title"><PLATFORM> — Privacy & Security</h1>

    <!-- Search & category filters (same markup/classes as Facebook/Instagram) -->
    <section class="guide-filters">
      <input id="guide-search" type="search" placeholder="Search guides" aria-label="Search guides">
      <div class="guide-categories">
        <!-- Codex: generate 10–12 category buttons consistent with platform surface -->
      </div>
    </section>

    <section id="guides" class="guide-grid">
      <!-- Codex inserts guide cards here -->
    </section>

    <p class="coming-soon" id="more-platforms-note" data-i18n="platforms.moreComing">
      More platforms are coming soon.
    </p>

    <button class="back-to-top" aria-label="Back to top">↑</button>
  </main>

  <script src="../assets/js/self-audit.js" defer></script>
</body>
</html>
```

> **Codex:** Keep classes/ids aligned with existing pages so search, filters, and styles work out-of-the-box.

---

## 3) Guide Card Template (use for *every* action)

Each action becomes one `<article>` card. Populate attributes and fields strictly.

```html
<article id="<slug>" class="guide-card"
         data-platform="<platform>"
         data-category="<category>"
         data-keywords="<comma-separated synonyms>">
  <h3 class="guide-title"><Title></h3>
  <p class="settings-path"><strong>Path:</strong> <short path breadcrumbs></p>

  <details open>
    <summary>Web (browser)</summary>
    <ol>
      <li>Step 1…</li>
      <li>Step 2…</li>
      <li>…</li>
      <li><em>Confirm:</em> (if destructive, e.g., click <strong>Delete</strong>)</li>
    </ol>
  </details>

  <details>
    <summary>Android app</summary>
    <ol>
      <li>Step 1…</li>
      <li>…</li>
      <li><em>Confirm:</em> …</li>
    </ol>
  </details>

  <details>
    <summary>iOS app</summary>
    <ol>
      <li>Step 1…</li>
      <li>…</li>
      <li><em>Confirm:</em> …</li>
    </ol>
  </details>
</article>
```

### Template rules

* **Slug:** lowercase, hyphens, e.g., `enable-two-factor-authentication`.
* **Category:** pick from the platform’s category list (see §4). One primary category per card.
* **Keywords:** include 4–10 common synonyms and UI terms users might search.
* **Path line:** short breadcrumb style, e.g., `Profile → ≡ → Settings and privacy → Privacy → Comments`.

---

## 4) Categories per platform (use these as buckets)

Codex must attach exactly one category per card. Add buttons for each category in the filters section.

### TikTok

* Account Security & Login
* Privacy & Safety
* Comments & Messages
* Duet, Stitch & Downloads
* For You & Recommendations
* Ad Settings & Personalization
* Family Pairing (educational only)
* Data & History
* Content & Posting
* Devices & Sessions
* Reports & Blocking
* App Permissions

### X / Twitter

* Account Security & Login
* Privacy & Safety
* Tweets & Replies
* Direct Messages
* Media & Sensitive Content
* Discovery & Visibility
* Ads & Personalization
* Data & Archive
* Spaces & Audio
* Mute/Block/Reports
* App Permissions

### WhatsApp

* Account Security & Login
* Privacy (Profile/Status/Last seen)
* Groups & Communities
* Messages & Media
* Disappearing & View-Once
* Linked Devices & Sessions
* Backups & Encryption
* Data & Export
* Business Features
* App Permissions

### Telegram

* Account Security & Login
* Privacy (Number/Profile/Last seen)
* Secret Chats
* Groups & Channels
* Bots & Integrations
* Messages & Media
* Devices & Sessions
* Data & Export
* Discovery & Nearby
* App Permissions

> **Future platforms:** reuse any of the above or define 10–12 clear categories.

---

## 5) Input Format You Will Paste With This Spec

Provide an **ordered list** of action titles per platform. Example (TikTok):

> ✅ Ready-made list: `tools/action-lists/tiktok-actions.txt` contains the full 130-item TikTok action list you can paste directly into Codex when generating the platform page.

```
[TikTok]
1) Enable Two-Factor Authentication (2FA)
2) Change Password
3) Review Active Devices & Log Out Unknown Sessions
4) Turn On Login Alerts
5) Make Account Private
6) Limit Who Can Duet Your Videos
7) Limit Who Can Stitch Your Videos
8) Turn Off Video Downloads
9) Filter Comments with Keyword Lists
10) Restrict Who Can Send You DMs
11) Limit Who Can Mention/Tag You
12) Control For You Page Personalization
13) Clear Watch History
14) Clear Search History
15) Limit Personalized Ads
16) Review Third-Party App Access
17) Download Your Data
18) Delete a Video
19) Bulk Delete Videos (Manage Posts)
20) Report a User
… (continue to the full target count)
```

Codex must generate one guide card per line, using the template in §3, assign categories from §4, and fill `data-keywords` with synonyms.

---

## 6) Writing Steps — Style Guide (very important)

* Address the user directly with simple verbs: *“Tap… Click… Scroll… Select…”*
* Granular, literal instructions (e.g., *“Tap your **profile** (bottom right). Tap the **≡** (top right). Tap **Settings and privacy**.”*)
* When a new panel opens, say so: *“A new screen opens.”*
* Always mention confirmation actions for deletions/toggles: *“Tap **Delete** again to confirm.”*
* For per-item toggles, add a final sentence: *“Repeat for any other items you want to change.”*
* If steps differ between Android & iOS, write them separately; otherwise keep both sections.

---

## 7) Platform Page Assembly Rules

* Number cards sequentially beginning at **#1** per platform page. Show numbers only in the index or H3 text if you already do so; otherwise just preserve order in the HTML output.
* Insert cards into `<section id="guides" class="guide-grid">`.
* Generate a minimal **category filter toolbar** with buttons (same classes as existing pages). Each button filters by `data-category`.
* Ensure **Back to top** button exists and works (use the existing class).
* Add a small **“More platforms are coming soon.”** note using the `<p class="coming-soon">` element already included in the skeleton.

---

## 8) Validation & QA (Codex must self-check)

After generating a platform page:

1. Confirm there are **no console errors** on load.
2. Confirm **no horizontal scrolling** at 320px width.
3. Search for 5 sample keywords; verify matching cards appear.
4. Toggle language to Hebrew; verify layout stays readable (even if strings are still English until translated).

---

## 9) Deliverables (per platform)

1. `platforms/<platform>.html` fully populated with 100–150 guide cards.
2. New platform tile on `platform.html` grid.
3. Optional: an auto-generated local index (titles list) at the top of the page linking to each `#<slug>`.

---

## 10) Example — One Completed Card (TikTok, downloads off)

```html
<article id="tiktok-turn-off-downloads" class="guide-card"
         data-platform="tiktok"
         data-category="Duet, Stitch & Downloads"
         data-keywords="downloads, save video, allow downloads, privacy, restrict saving">
  <h3 class="guide-title">Turn Off Video Downloads</h3>
  <p class="settings-path"><strong>Path:</strong> Profile → ≡ → Settings and privacy → Privacy → Downloads</p>

  <details open>
    <summary>Web (browser)</summary>
    <ol>
      <li>Go to tiktok.com and sign in.</li>
      <li>Click your <strong>profile picture</strong> (top right) → <strong>Settings and privacy</strong>.</li>
      <li>Click <strong>Privacy</strong> → <strong>Downloads</strong>.</li>
      <li>Turn <strong>Video downloads</strong> <strong>OFF</strong>.</li>
      <li><em>Confirm:</em> If asked, click <strong>Turn off</strong> to confirm.</li>
    </ol>
  </details>

  <details>
    <summary>Android app</summary>
    <ol>
      <li>Open TikTok. Tap your <strong>profile</strong> (bottom right).</li>
      <li>Tap the <strong>≡</strong> (top right) → <strong>Settings and privacy</strong>.</li>
      <li>Tap <strong>Privacy</strong> → <strong>Downloads</strong>.</li>
      <li>Turn <strong>Video downloads</strong> <strong>OFF</strong>.</li>
      <li><em>Confirm:</em> Tap <strong>Turn off</strong> if a confirmation appears.</li>
    </ol>
  </details>

  <details>
    <summary>iOS app</summary>
    <ol>
      <li>Open TikTok. Tap your <strong>profile</strong> (bottom right).</li>
      <li>Tap the <strong>≡</strong> (top right) → <strong>Settings and privacy</strong>.</li>
      <li>Tap <strong>Privacy</strong> → <strong>Downloads</strong>.</li>
      <li>Turn <strong>Video downloads</strong> <strong>OFF</strong>.</li>
      <li><em>Confirm:</em> Tap <strong>Turn off</strong> if asked.</li>
    </ol>
  </details>
</article>
```

---

## 11) Generation Mode (push Codex to the limit)

* Codex should attempt to generate **the entire platform** in **one pass** when given the full list (100–150 actions).
* If Codex times out or truncates, rerun with **remaining items only**. The spec and template stay identical.
* After TikTok is generated, reuse the same process for **X/Twitter**, **WhatsApp**, and **Telegram**.

---

## 12) After Generation — What Codex Must Report Back

At the end of a run, Codex should print a short checklist:

* Total guides generated.
* Any titles it could not map to a clear path (mark TODO).
* Any platform features not available on Web/Android/iOS.
* Any category with fewer than 5 cards (in case coverage looks thin).

---

**End of Spec.** Paste this spec into Codex along with a platform’s action list to auto-generate that platform page. For future platforms, reuse this exact spec and swap the list.
