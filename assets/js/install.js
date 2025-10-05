(function(){
  function ready(callback) {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function init() {
    const installButton = document.getElementById('installTrigger');
    const iosButton = document.getElementById('iosHowTo');
    let deferredPrompt = null;

    function setInstallEnabled(enabled) {
      if (!installButton) return;
      if (enabled) {
        installButton.removeAttribute('disabled');
        installButton.removeAttribute('aria-disabled');
      } else {
        installButton.setAttribute('disabled', '');
        installButton.setAttribute('aria-disabled', 'true');
      }
    }

    setInstallEnabled(false);

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      setInstallEnabled(true);
    });

    window.addEventListener('appinstalled', () => {
      setInstallEnabled(false);
      if (installButton) {
        installButton.dataset.installed = 'true';
      }
    });

    installButton?.addEventListener('click', async () => {
      if (!deferredPrompt) {
        if (typeof window !== 'undefined') {
          window.alert(window.I18N ? window.I18N.t('homePage.installFallback') : 'Use your browser options to add this site to your home screen.');
        }
        return;
      }
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          setInstallEnabled(false);
        } else {
          setInstallEnabled(true);
        }
      } catch (error) {
        console.error('Install prompt failed', error);
        setInstallEnabled(false);
      } finally {
        deferredPrompt = null;
      }
    });

    iosButton?.addEventListener('click', () => {
      try {
        window.open('https://support.apple.com/en-us/HT201997', '_blank', 'noopener');
      } catch (error) {
        console.error('Unable to open iOS instructions', error);
      }
    });
  }

  ready(init);
})();
