(function(){
  const searchForm = document.getElementById('guide-search-form');
  const searchInput = document.getElementById('guide-search-input');
  const resetButton = searchForm ? searchForm.querySelector('.guide-search-reset') : null;
  const status = document.getElementById('guide-search-count');
  const emptyMessage = document.getElementById('guide-search-empty');
  const backToTop = document.querySelector('.back-to-top');
  const platformSidebar = document.querySelector('.platform-sidebar');
  const categoryBrowser = document.querySelector('[data-category-browser]');
  const categoryGrid = categoryBrowser ? categoryBrowser.querySelector('[data-category-grid]') : null;
  const categoryDetail = categoryBrowser ? categoryBrowser.querySelector('[data-category-detail]') : null;
  const categoryTitle = categoryBrowser ? categoryBrowser.querySelector('[data-category-title]') : null;
  const categoryCount = categoryBrowser ? categoryBrowser.querySelector('[data-category-count]') : null;
  const categoryBack = categoryBrowser ? categoryBrowser.querySelector('[data-category-back]') : null;

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

  let gridView = Boolean(categoryBrowser);
  let activeCategory = null;

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
    if (gridView) {
      status.textContent = 'Select a category to view Facebook privacy actions.';
      return;
    }
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
      const matchesQuery = !query || guide.searchText.includes(query);
      const matchesCategory = !activeCategory || guide.category === activeCategory;
      const shouldShow = !gridView && matchesQuery && matchesCategory;
      guide.section.classList.toggle('is-hidden', !shouldShow);
      if (guide.navItem) {
        guide.navItem.classList.toggle('is-hidden', !(!gridView && matchesQuery && matchesCategory));
      }
      highlight(guide.titleEl, guide.originalTitle, gridView ? '' : query);
      if (guide.navLink) {
        highlight(guide.navLink, guide.originalNav, gridView ? '' : query);
      }
      if (shouldShow) {
        matches += 1;
      }
    });

    categoryDataList.forEach((category)=>{
      const matchesCategory = !activeCategory || category.key === activeCategory;
      const anyVisible = category.items.some((item)=>!item.classList.contains('is-hidden'));
      const showHeading = !gridView && matchesCategory && anyVisible;
      if (category.heading) {
        category.heading.classList.toggle('is-hidden', !showHeading);
      }
      if (category.navDetails) {
        const showNav = !gridView && matchesCategory && anyVisible;
        category.navDetails.classList.toggle('is-hidden', !showNav);
        if (!showNav) {
          category.navDetails.open = false;
        } else if (query) {
          category.navDetails.open = true;
        }
      }
    });

    if (emptyMessage) {
      emptyMessage.hidden = gridView ? true : matches !== 0;
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

  const showGridView = ()=>{
    if (!categoryBrowser) return;
    gridView = true;
    activeCategory = null;
    categoryBrowser.classList.remove('is-detail-active');
    if (categoryGrid) {
      categoryGrid.removeAttribute('hidden');
    }
    if (categoryDetail) {
      categoryDetail.setAttribute('hidden', '');
    }
    if (searchForm) {
      searchForm.classList.add('is-hidden');
    }
    if (platformSidebar) {
      platformSidebar.classList.add('is-hidden');
    }
    if (searchInput) {
      searchInput.value = '';
    }
    filterGuides('');
    syncQueryParam('');
  };

  const showCategoryView = (categoryKey)=>{
    if (!categoryBrowser) return;
    const category = categories.get(categoryKey);
    if (!category) return;
    gridView = false;
    activeCategory = categoryKey;
    categoryBrowser.classList.add('is-detail-active');
    if (categoryGrid) {
      categoryGrid.setAttribute('hidden', '');
    }
    if (categoryDetail) {
      categoryDetail.removeAttribute('hidden');
    }
    if (categoryTitle) {
      categoryTitle.textContent = category.label;
    }
    if (categoryCount) {
      const count = category.items.length;
      categoryCount.textContent = `${count} action${count === 1 ? '' : 's'}`;
    }
    if (searchForm) {
      searchForm.classList.remove('is-hidden');
    }
    if (platformSidebar) {
      platformSidebar.classList.remove('is-hidden');
    }
    filterGuides(searchInput ? searchInput.value : '');
    const firstVisible = category.heading || category.items[0] || null;
    if (firstVisible && typeof firstVisible.scrollIntoView === 'function') {
      firstVisible.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const buildCategoryBrowser = ()=>{
    if (!categoryBrowser || !categoryGrid) return;
    categoryGrid.innerHTML = '';
    categories.forEach((category)=>{
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'category-tile';
      tile.textContent = category.label;
      tile.addEventListener('click', ()=>{
        showCategoryView(category.key);
      });
      categoryGrid.appendChild(tile);
    });
    if (categoryBack) {
      categoryBack.addEventListener('click', ()=>{
        showGridView();
        categoryBrowser.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    showGridView();
  };

  const initialQuery = new URL(window.location.href).searchParams.get('q') || '';

  if (categoryBrowser && categoryGrid) {
    buildCategoryBrowser();
  } else {
    if (initialQuery) {
      searchInput.value = initialQuery;
    }
    filterGuides(searchInput.value || '');
    syncQueryParam(searchInput.value || '');
  }

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
