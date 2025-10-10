# Platform Coverage Status (2025-10-04)

This audit captures the current state of each platform guide so we know where deeper build-outs are required.

## Facebook (`platforms/facebook.html`)
* ✅ Uses the new category browser + search layout powered by `assets/js/platform-guides.js`.
* ✅ Covers major pillars: account security, privacy, discovery/visibility, groups, marketplace, ads, data export, account closure, etc.
* ⚠️ Still renders the legacy "On this page" sidebar even though the new category browser already replaces it.

## Instagram (`platforms/instagram.html`)
* ⚠️ Uses the legacy static index (huge ordered list) instead of the category browser tiles.
* ⚠️ Has a "Navigation Primer" card and "On this page" sidebar that we now want to remove.
* ⚠️ The 120-action list is impressive but overwhelming; it needs to be broken into curated categories before it can plug into the Facebook-style browser.
* ➕ Future additions: Revisit ad settings (Meta verified data sharing, activity off Meta), advanced messaging safety, business account toggles, creator monetisation privacy, Threads integration privacy, and parental controls.

## X (`platforms/x.html`)
* ❌ Page points at a missing stylesheet (`../assets/css/main.css`), so it loads without any design.
* ❌ Layout predates the shared template (no wrapper/header/footer parity, no category browser/search wiring).
* ⚠️ Guide catalog is limited to security + a few content controls; it’s missing spaces safety, community notes privacy, circle/audience tools, legacy tweet cleanup, profile discoverability, DM safety, ad targeting, data export, and advanced filters.

## TikTok (`platforms/tiktok.html`)
* ⚠️ Uses a custom inline JS filter and bespoke markup instead of the shared category browser/search.
* ⚠️ Content leans heavily on generic wording ("Adjust the setting"), needs platform-specific detail and confirmation steps.
* ➕ Missing categories to add: identity protection (aliases, profile privacy), live stream controls, comment keyword filters, duet/stitch per-post overrides, account linkage to other apps, data download, ad personalisation, parental controls, reports/appeals.

## WhatsApp (`platforms/whatsapp.html`)
* ⚠️ Similar bespoke layout and inline scripting; needs to adopt the shared template.
* ⚠️ Current guides cover core security, privacy, and messaging but skip deeper topics: disappearing messages defaults, communities privacy, channel settings, backup encryption for multi-device, business-specific privacy, device-level permissions, compliance exports.

## Telegram (`platforms/telegram.html`)
* ⚠️ Still uses Navigation Primer + huge guide index. Needs category browser wiring.
* ➕ Expand beyond the first 12 actions: advanced chat folder hygiene, bot permissions, story privacy, paid premium settings, channel admin security, contact import/export, secret media timers, autop-run detection, data cleanup.

## Platform Landing (`platform.html`)
* ⚠️ Simple tile grid only. Needs teaser copy or grouping to prep visitors for the new per-platform UX and emphasise that each tile opens a category browser.

---

**Next steps:**
1. Refactor every platform page (except Facebook) to the shared category browser + search layout with categories that match their feature sets.
2. Remove the "Navigation Primer" card + "On this page" sidebars after migrating the content those sections carried into the appropriate categories.
3. Build richer guide coverage for the ⚠️/➕ bullets above so each platform has comparable depth.
