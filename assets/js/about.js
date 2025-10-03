(function(){
  const article = document.getElementById('about-article');
  const tocEl = document.getElementById('about-toc');
  const backBtn = document.getElementById('backToTop');
  if(!article || !tocEl) return;

  const h2s = Array.from(article.querySelectorAll('h2'));
  const h3s = Array.from(article.querySelectorAll('h3'));
  const allHeadings = [...h2s, ...h3s];

  allHeadings.forEach(h => {
    if(!h.id){
      h.id = h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    }
    if(!h.hasAttribute('tabindex')){
      h.setAttribute('tabindex','-1');
    }
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = `#${h.id}`;
    anchor.setAttribute('aria-label', `Link to ${h.textContent}`);
    anchor.textContent = '#';
    h.appendChild(anchor);
  });

  let toggle = null;
  if(h2s.length){
    const card = document.createElement('div');
    card.className = 'toc-card';
    const title = document.createElement('h2');
    title.textContent = 'On this page';
    const nav = document.createElement('nav');
    nav.className = 'toc-nav';
    nav.id = 'about-toc-nav';
    nav.setAttribute('aria-label','On this page');
    const list = document.createElement('ul');
    list.className = 'toc-list';
    nav.appendChild(list);

    h2s.forEach(h => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${h.id}`;
      link.textContent = h.textContent.replace(/#$/,'').trim();
      link.addEventListener('click', evt => {
        evt.preventDefault();
        const target = document.getElementById(h.id);
        if(!target) return;
        if(isMobile()){ collapseToc(true); }
        scrollToHeading(target);
      });
      li.appendChild(link);
      list.appendChild(li);
    });

    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'toc-toggle';
    toggle.innerHTML = '<span>On this page</span><span aria-hidden="true">▾</span>';
    toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls','about-toc-nav');
    toggle.addEventListener('click', () => {
      const collapsed = tocEl.dataset.collapsed !== 'false';
      collapseToc(!collapsed);
    });

    tocEl.dataset.collapsed = 'true';
    tocEl.appendChild(toggle);
    card.appendChild(title);
    card.appendChild(nav);
    tocEl.appendChild(card);

    const mq = window.matchMedia('(min-width: 980px)');
    function syncLayout(e){
      const matches = e.matches;
      if(matches){
        toggle.hidden = true;
        tocEl.dataset.collapsed = 'false';
        toggle.setAttribute('aria-expanded','true');
      }else{
        toggle.hidden = false;
        collapseToc(true);
      }
    }
    if(mq.addEventListener){
      mq.addEventListener('change', syncLayout);
    }else if(mq.addListener){
      mq.addListener(syncLayout);
    }
    syncLayout(mq);
  }else{
    tocEl.hidden = true;
  }

  if(backBtn){
    window.addEventListener('scroll', () => {
      backBtn.hidden = window.scrollY < 600;
    });
    backBtn.addEventListener('click', () => {
      window.scrollTo({top:0, behavior: prefersReducedMotion()? 'auto':'smooth'});
    });
  }

  if(location.hash){
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if(target){
      if(isMobile() && toggle){ collapseToc(false); toggle.setAttribute('aria-expanded','true'); }
      setTimeout(() => {
        scrollToHeading(target, true);
      }, 0);
    }
  }

  function scrollToHeading(target, preserveHash){
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    target.scrollIntoView({behavior, block:'start'});
    if(!preserveHash){
      history.pushState(null, '', `#${target.id}`);
    }
    try{
      target.focus({preventScroll:true});
    }catch(err){
      target.focus();
    }
  }

  function prefersReducedMotion(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function collapseToc(forceCollapsed){
    if(!toggle) return;
    const collapsed = forceCollapsed === true;
    tocEl.dataset.collapsed = collapsed ? 'true' : 'false';
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  function isMobile(){
    return window.matchMedia && !window.matchMedia('(min-width: 980px)').matches;
  }
})();
