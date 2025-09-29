document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const links = document.querySelectorAll('nav a');
  links.forEach(link => {
    const target = link.getAttribute('href');
    if (!target) return;
    const normalized = target.replace(/\/+$/, '') || '/';
    if (normalized === path || (path.startsWith(normalized) && normalized !== '/')) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.setAttribute('aria-current', 'false');
    }
  });
});
