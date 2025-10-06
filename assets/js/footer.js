(function(){
  if (document.querySelector('.site-footer')) return; // avoid duplicates
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="footer-inner">
      <span>© <a href="/PRIVACY/" rel="home">OSINT.Secrets</a></span>
      <span class="sep">·</span>
      <a href="https://www.instagram.com/osintsecrets/" target="_blank" rel="noopener noreferrer">Instagram</a>
    </div>
  `;
  (document.body || document.documentElement).appendChild(footer);
})();
