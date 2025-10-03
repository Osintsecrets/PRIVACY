(function(){
  const searchForm = document.getElementById('guide-search-form');
  const searchInput = document.getElementById('guide-search-input');
  const resetButton = searchForm ? searchForm.querySelector('.guide-search-reset') : null;
  const status = document.getElementById('guide-search-count');
  const emptyMessage = document.getElementById('guide-search-empty');
  const backToTop = document.querySelector('.back-to-top');

  if (!searchForm || !searchInput || !status) {
    return;
  }

  const guideSections = Array.from(document.querySelectorAll('section.card[id^="guide-"]'));
  const navLinks = new Map();
  const navItems = new Map();
  document.querySelectorAll('#guide-index ol > li:not(.guide-range-divider) > a').forEach((link)=>{
    const id = link.getAttribute('href')?.slice(1);
    if (!id) return;
    navLinks.set(id, link);
    navItems.set(id, link.parentElement);
  });

  const guideData = guideSections.map((section)=>{
    const id = section.id;
    const titleEl = section.querySelector('h2');
    const navLink = navLinks.get(id) || null;
    const navItem = navItems.get(id) || null;
    const text = (titleEl ? titleEl.textContent : '') + ' ' + section.textContent;
    return {
      id,
      section,
      titleEl,
      navLink,
      navItem,
      searchText: text.toLowerCase(),
      originalTitle: titleEl ? titleEl.innerHTML : '',
      originalNav: navLink ? navLink.innerHTML : ''
    };
  });

  const rangeHeadings = Array.from(document.querySelectorAll('.guide-range-heading'));
  const navDividers = Array.from(document.querySelectorAll('#guide-index .guide-range-divider'));
  const groups = rangeHeadings.map((heading, index)=>{
    const items = [];
    let next = heading.nextElementSibling;
    while (next) {
      if (next.classList && next.classList.contains('guide-range-heading')) {
        break;
      }
      if (next.matches && next.matches('section.card[id^="guide-"]')) {
        items.push(next);
      }
      next = next.nextElementSibling;
    }
    return {
      heading,
      items,
      divider: navDividers[index] || null
    };
  });

  const totalGuides = guideData.length;

  const escapeRegExp = (value)=>value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const highlight = (element, original, term)=>{
    if (!element) return;
    if (!term) {
      element.innerHTML = original;
      return;
    }
    try {
      const regex = new RegExp(`(${escapeRegExp(term)})`, 'ig');
      element.innerHTML = original.replace(regex, '<mark>$1</mark>');
    } catch (err) {
      element.innerHTML = original;
    }
  };

  const updateStatus = (count, term)=>{
    if (!status) return;
    if (term) {
      status.textContent = `Showing ${count} of ${totalGuides} actions`;
    } else {
      status.textContent = `Showing all ${totalGuides} actions`;
    }
  };

  const filterGuides = (term)=>{
    const query = term.trim().toLowerCase();
    let matches = 0;
    guideData.forEach((guide)=>{
      const isMatch = !query || guide.searchText.includes(query);
      guide.section.classList.toggle('is-hidden', !isMatch);
      if (guide.navItem) {
        guide.navItem.classList.toggle('is-hidden', !isMatch);
      }
      highlight(guide.titleEl, guide.originalTitle, query);
      if (guide.navLink) {
        highlight(guide.navLink, guide.originalNav, query);
      }
      if (isMatch) {
        matches += 1;
      }
    });

    groups.forEach((group)=>{
      const anyVisible = group.items.some((item)=>!item.classList.contains('is-hidden'));
      if (group.heading) {
        group.heading.classList.toggle('is-hidden', !anyVisible);
      }
      if (group.divider) {
        group.divider.classList.toggle('is-hidden', !anyVisible);
      }
    });

    if (emptyMessage) {
      emptyMessage.hidden = matches !== 0;
    }
    updateStatus(matches, query);
  };

  const syncQueryParam = (value)=>{
    const url = new URL(window.location.href);
    if (value.trim()) {
      url.searchParams.set('q', value.trim());
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState({}, '', url);
  };

  const initialQuery = new URL(window.location.href).searchParams.get('q') || '';
  if (initialQuery) {
    searchInput.value = initialQuery;
  }
  filterGuides(searchInput.value || '');
  syncQueryParam(searchInput.value || '');

  searchInput.addEventListener('input', ()=>{
    const value = searchInput.value;
    filterGuides(value);
    syncQueryParam(value);
  });

  if (resetButton) {
    searchForm.addEventListener('reset', ()=>{
      window.requestAnimationFrame(()=>{
        searchInput.value = '';
        filterGuides('');
        syncQueryParam('');
        searchInput.focus();
      });
    });
  }

  if (backToTop) {
    backToTop.classList.add('is-hidden');
    const toggleBackToTop = ()=>{
      if (window.scrollY > 400) {
        backToTop.classList.remove('is-hidden');
      } else {
        backToTop.classList.add('is-hidden');
      }
    };
    toggleBackToTop();
    window.addEventListener('scroll', toggleBackToTop, { passive: true });
  }
})();
