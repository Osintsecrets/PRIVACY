/* PWA install + iOS how-to */
(function(){
  const installBtn = document.getElementById('installTrigger');
  const iosBtn = document.getElementById('iosHowTo');
  const iosDialog = document.getElementById('iosDialog');
  const iosClose = document.getElementById('iosClose');

  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.disabled = false;
  });

  if (installBtn) {
    installBtn.disabled = true;
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.disabled = true;
    });
  }

  if (iosBtn && iosDialog) {
    iosBtn.addEventListener('click', () => iosDialog.showModal());
  }
  if (iosClose && iosDialog) {
    iosClose.addEventListener('click', () => iosDialog.close());
  }
})();
