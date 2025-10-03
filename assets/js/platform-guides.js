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
  const guideIndexNav = document.getElementById('guide-index');
  const categoryHeadings = new Map();
  document.querySelectorAll('.guide-category-heading[data-category]').forEach((heading)=>{
    const category = heading.dataset.category;
    if (!category) return;
    categoryHeadings.set(category, heading);
  });

  const categories = new Map();
  guideSections.forEach((section)=>{
    const category = section.dataset.category || 'uncategorized';
    if (!categories.has(category)) {
      const heading = categoryHeadings.get(category) || null;
      const label = heading ? heading.textContent.trim() : category;
      categories.set(category, {
        key: category,
        heading,
        label,
        items: [],
        navDetails: null,
        navList: null
      });
    }
    categories.get(category).items.push(section);
  });

  if (guideIndexNav) {
    guideIndexNav.innerHTML = '';
    categories.forEach((category)=>{
      const details = document.createElement('details');
      details.classList.add('guide-category');
      details.dataset.category = category.key;
      details.open = true;

      const summary = document.createElement('summary');
      summary.textContent = category.label;
      details.appendChild(summary);

      const list = document.createElement('ol');
      list.classList.add('guide-category-list');
      details.appendChild(list);

      guideIndexNav.appendChild(details);
      category.navDetails = details;
      category.navList = list;
    });
  }

  const navLinks = new Map();
  const navItems = new Map();

  const guideData = guideSections.map((section)=>{
    const id = section.id;
    const titleEl = section.querySelector('h2');
    const category = section.dataset.category || 'uncategorized';
    const categoryData = categories.get(category) || null;
    let navLink = null;
    let navItem = null;
    if (categoryData && categoryData.navList) {
      navItem = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${id}`;
      const titleHtml = titleEl ? titleEl.innerHTML : id;
      link.innerHTML = titleHtml;
      navItem.appendChild(link);
      categoryData.navList.appendChild(navItem);
      navLink = link;
      navLinks.set(id, link);
      navItems.set(id, navItem);
    }
    const text = (titleEl ? titleEl.textContent : '') + ' ' + section.textContent;
    return {
      id,
      section,
      titleEl,
      navLink,
      navItem,
      category,
      searchText: text.toLowerCase(),
      originalTitle: titleEl ? titleEl.innerHTML : '',
      originalNav: navLink ? navLink.innerHTML : ''
    };
  });

  const categoryDataList = Array.from(categories.values());

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

    categoryDataList.forEach((category)=>{
      const anyVisible = category.items.some((item)=>!item.classList.contains('is-hidden'));
      if (category.heading) {
        category.heading.classList.toggle('is-hidden', !anyVisible);
      }
      if (category.navDetails) {
        category.navDetails.classList.toggle('is-hidden', !anyVisible);
        if (!anyVisible) {
          category.navDetails.open = false;
        } else if (query) {
          category.navDetails.open = true;
        }
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
