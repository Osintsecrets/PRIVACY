# Canvas Prompt: Initial Site Cleanup & Layout Refactors

You are working inside the `PRIVACY` static site repo. Update only text-based assets (HTML, CSS, JS, JSON, Markdown). Do **not** create, delete, or modify binary files.

## Goals
1. Refresh the landing experience so the homepage is clean, focused, and branded consistently as “OSINT Secrets” (no "OSINT.Secrets" variants).
2. Modernise the platform guides so every platform matches the Facebook reference layout (category browser + search) and removes redundant widgets (navigation primer, "On this page" sidebar, ad-hoc filters).
3. Prepare the self-audit workflow for deep phase content by keeping the hub simple and ensuring each phase page is ready for long-form checklists with breadcrumbs + return paths.
4. Remove stray UI chrome (“On this page” cards, unused bottom menus) and align secondary pages (About, Why, Disclaimer) with the refreshed design.

## Detailed Tasks

### 1. Homepage cleanup (`index.html`, `assets/css/styles.css`, `assets/js/home.js` if present)
- Remove the three square callouts under the header (language select / install / add-on / pledge pill) so the hero stands alone.
- Adjust spacing so the hero copy stays vertically balanced after the toolbar disappears.
- Confirm no JS references rely on the removed controls; delete dead code from `assets/js/install.js` or `assets/js/home.js` if it only powered that toolbar. Keep the pledge modal accessible elsewhere if needed.
- Ensure the footer branding reads “© OSINT Secrets” without a dot, and style it (font weight/letter spacing) so it feels intentional.

### 2. Footer/menu sanity (`assets/js/footer.js`, global HTML files)
- Audit every page for duplicate or phantom bottom menus. Remove the auto-injected footer script (`assets/js/footer.js`) if each page already ships with a semantic footer.
- Standardise the footer markup site-wide (`<footer id="site-footer" class="site-footer">…OSINT Secrets…`).

### 3. Self-audit hub + phase shells (`self-audit.html`, `self-audit/*.html`, `assets/css/styles.css`, `assets/js/self-audit.js`)
- Keep the hub to four tiles (Discover/Analyze/Reduce/Keep Safe) with short blurbs and “Open phase” buttons—no checklists on the hub.
- On each phase page (Discover/Analyze/Reduce/Keep Safe):
  * Add breadcrumb nav back to Home → Self-audit → Phase (already present—just confirm styling matches).
  * Replace the empty `<section id="phase-checklists">` with a structured template ready for detailed guides (e.g., intro callout, placeholder accordions or cards with headings for key themes). Do **not** add actual checklists yet; just scaffold sections and include TODO comments.
  * Ensure “Open phase” buttons on the hub point to these pages and that there are accessible back links.

### 4. Platform landing (`platform.html`)
- Above the tile grid, add a short lead paragraph explaining that each platform opens a deep-dive with categories and search.
- Remove any stray copy about “more coming soon” if it no longer applies, or restyle it as subdued text.

### 5. Platform page refactors (per-file work)
Apply the Facebook layout pattern to **Instagram, Telegram, TikTok, WhatsApp, and X**. Reference `platforms/facebook.html` + `assets/js/platform-guides.js`.

For each page:
- Use the shared header/footer wrapper and include `<div class="wrapper platform-wrapper">…` just like Facebook.
- Remove bespoke nav bars (`site-header`, `.site-nav`), inline scripts, navigation primers, and “On this page” sidebars.
- Populate a `<div class="category-browser" data-category-browser>` with category tiles; each category should map to the right set of guide sections (existing guides can be regrouped).
- Reorganise existing guide `<section>` blocks so they carry a `data-category` attribute matching the categories, with headings formatted like Facebook’s (h2 title, per-surface `<details>` for Desktop/Mobile, optional tip paragraph).
- Ensure each page includes the shared search form markup (`guide-search`), status paragraph, empty message, and loads `../assets/js/platform-guides.js`.
- Update copy where needed to be platform-specific and concrete (avoid “Adjust the setting”; specify exact toggles/buttons and finish steps).
- Bring over any unique guidance currently living in “Navigation primer” sections into the most relevant category (e.g., create an "Orientation & navigation" category if necessary).
- Fix the X page stylesheet link to `../assets/css/styles.css` and align it visually (dark theme, same fonts).

### 6. Remove "On this page" UX globally
- Delete the sidebar markup + JS powering "On this page" on platform pages and on `about/index.html` (clean up `assets/js/about.js`).
- Ensure headings remain navigable (consider adding anchor links via CSS if needed, but avoid reintroducing the sidebar).

### 7. Secondary page polish
- **About page**: After removing the sidebar, rebalance the layout (wider article column, follow block styling). Keep the Instagram link but make sure it’s visually integrated (maybe a subdued callout instead of a floating list).
- **Why page**: Review typography hierarchy, add breathing room, and ensure the content matches the updated brand tone. Remove any unused scripts/styles.
- **Disclaimer**: Re-read the legal copy, tighten the language for clarity/authority, and present it in a card with clear headings (e.g., Purpose, No Legal Advice, Your Responsibility, Seek Professional Help). Ensure the tone feels firm enough to be enforceable but still friendly.

### 8. Accessibility & consistency
- After refactors, verify all interactive elements keep keyboard focus styles, aria labels, and proper heading levels.
- Update or remove translations keys in `i18n/` if elements are deleted (e.g., toolbar labels, navigation primer strings).

## Deliverables
- Updated HTML/CSS/JS files reflecting the above changes.
- Deleted `assets/js/footer.js` if the injected footer is no longer required.
- Updated i18n resource files if strings were removed.
- No binary assets added/changed.

## Post-change checks
1. `npm test` (if defined) or `npm run lint` to ensure static checks still pass.
2. Manually open affected HTML files in a browser to confirm layout and interactions.
3. Provide a concise changelog summarising major improvements.
