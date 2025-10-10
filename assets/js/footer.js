(function(){
  if (document.querySelector('.site-footer')) return; // avoid duplicates
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="footer-inner">
      <span>© <a href="/PRIVACY/" rel="home">OSINTSecrets</a></span>
    </div>
  `;
  (document.body || document.documentElement).appendChild(footer);
})();
