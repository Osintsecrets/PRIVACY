/* Minimal i18n: EN/HE with RTL toggle + ?lang= param + localStorage */
(function(){
  const STR = {
    en: {
      "site.title": "Social Risk Audit — Privacy Almanac",
      "site.brand": "Social Risk Audit",
      "nav.home": "Home",
      "nav.platform": "Platform",
      "nav.why": "Why",
      "nav.ethics": "Ethics",
      "nav.about": "About",
      "nav.contact": "Contact",
      "nav.disclaimer": "Disclaimer",
      "ui.installApp": "Install App",
      "ui.iosAdd": "Add on iPhone",
      "ui.close": "Close",
      "home.h1": "Be the master of your privacy.",
      "home.lede": "A fast, ethics-first privacy almanac. Learn why privacy matters and take control with clear, step-by-step actions for the platforms you use.",
      "home.cta.platform.tag": "Start here",
      "home.cta.platform.title": "Fix my privacy on social apps",
      "home.cta.platform.body": "Facebook today, more platforms next. Clear, screenshot-friendly steps.",
      "home.cta.why.tag": "Mindset",
      "home.cta.why.title": "Why this matters (and to whom)",
      "home.cta.why.body": "Short, compelling reasons to act—without fear or jargon.",
      "home.cta.ethics.tag": "Ethics",
      "home.cta.ethics.title": "Our line: protect, don’t expose",
      "home.cta.ethics.body": "Consent, dignity, and responsibility—no doxxing, no vigilantism.",
      "home.notice": "You choose how deep to go. This site helps you take control—at your pace.",
      "pledge.title": "Ethics Pledge",
      "pledge.body": "Use this guide to protect, not to harm. No doxxing, no harassment, no vigilantism. Proceed only if you agree.",
      "pledge.agree": "I agree",
      "pledge.read": "Read ethics",
      "ios.title": "Add to Home Screen (iPhone)",
      "ios.step1": "Open in Safari.",
      "ios.step2": "Tap the Share icon.",
      "ios.step3": "Choose ‘Add to Home Screen’.",
      "footer.updated": "Last updated",
    },
    he: {
      "site.title": "Social Risk Audit — אלמנך פרטיות",
      "site.brand": "Social Risk Audit",
      "nav.home": "בית",
      "nav.platform": "פלטפורמה",
      "nav.why": "למה",
      "nav.ethics": "אתיקה",
      "nav.about": "אודות",
      "nav.contact": "צור קשר",
      "nav.disclaimer": "הצהרה משפטית",
      "ui.installApp": "התקן אפליקציה",
      "ui.iosAdd": "הוסף לאייפון",
      "ui.close": "סגור",
      "home.h1": "תהיה המאסטר של הפרטיות שלך.",
      "home.lede": "אלמנך פרטיות מהיר עם אתיקה תחילה. למד מדוע זה חשוב וקבל שליטה עם צעדים ברורים לפי פלטפורמה.",
      "home.cta.platform.tag": "התחל כאן",
      "home.cta.platform.title": "לשפר פרטיות באפליקציות חברתיות",
      "home.cta.platform.body": "פייסבוק היום, ועוד בקרוב. צעדים ברורים שמתאימים לצילומי מסך.",
      "home.cta.why.tag": "תודעה",
      "home.cta.why.title": "למה זה חשוב (ולמי)",
      "home.cta.why.body": "סיבות קצרות ומשכנעות לפעול—בלי פחד או ז׳רגון.",
      "home.cta.ethics.tag": "אתיקה",
      "home.cta.ethics.title": "הקו שלנו: להגן, לא לחשוף",
      "home.cta.ethics.body": "הסכמה, כבוד ואחריות—בלי דוקסינג ובלי ויג׳ילנטיות.",
      "home.notice": "את/ה קובע/ת כמה עמוק להיכנס. האתר עוזר לך לשלוט—בקצב שלך.",
      "pledge.title": "התחייבות אתית",
      "pledge.body": "השתמש/י במדריך כדי להגן—not לפגוע. אין דוקסינג, אין הטרדה, אין ויג׳ילנטיות. המשך/י רק אם את/ה מסכימ/ה.",
      "pledge.agree": "מסכימ/ה",
      "pledge.read": "קרא/י אתיקה",
      "ios.title": "הוספה למסך הבית (iPhone)",
      "ios.step1": "פתח/י בספארי.",
      "ios.step2": "הקש/י על שיתוף.",
      "ios.step3": "בחר/י ‘הוסף למסך הבית’.",
      "footer.updated": "עודכן לאחרונה",
    }
  };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function getLangFromQuery() {
    const m = location.search.match(/[?&]lang=(en|he)\b/);
    return m ? m[1] : null;
  }
  function setDir(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'he') ? 'rtl' : 'ltr';
  }
  function applyI18n(lang) {
    const dict = STR[lang] || STR.en;
    $$('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    document.title = dict['site.title'] || document.title;
  }

  const saved = localStorage.getItem('sra_lang');
  const query = getLangFromQuery();
  const lang = query || saved || 'en';
  setDir(lang);
  applyI18n(lang);

  const langSel = $('#lang');
  if (langSel) {
    langSel.value = lang;
    langSel.addEventListener('change', () => {
      const v = langSel.value;
      localStorage.setItem('sra_lang', v);
      setDir(v);
      applyI18n(v);
    });
  }
})();
