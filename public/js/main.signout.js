// main.signout.js – cerrar sesión y mensaje en main
window.MainSignout = (function () {
  function getLang() {
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === 'function') {
        var prefs = window.PrefsStore.load();
        if (prefs && prefs.language) return prefs.language;
      }
    } catch (e) {}
    return 'es';
  }

  var TEXTS = {
    es: {
      title: 'Cerrar sesión',
      message:
        'Tu sesión se ha cerrado con éxito. Vuelve en tu próximo uso para seguir disfrutando de los beneficios de Study.GODiOS.org.',
    },
    en: {
      title: 'Sign out',
      message:
        'Your session has been closed successfully. Come back on your next visit to keep enjoying the benefits of Study.GODiOS.org.',
    },
  };

  function t(key) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || key;
  }

  // Ejecuta el signout real contra Supabase y re-aplica preferencias locales
  async function doSignOut() {
    try {
      if (window.AuthSession && typeof window.AuthSession.clear === 'function') {
        await window.AuthSession.clear();
      } else if (
        window.BackendSupabase &&
        typeof window.BackendSupabase.signOut === 'function'
      ) {
        await window.BackendSupabase.signOut();
      }
    } catch (e) {
      console.warn('[Signout] error while signing out', e);
    }

    // Reaplicamos preferencias locales para forzar refresco de header/buttons
    try {
      if (
        window.PrefsStore &&
        typeof window.PrefsStore.apply === 'function'
      ) {
        var prefs =
          (window.PrefsStore.load && window.PrefsStore.load()) ||
          window.PrefsStore.DEFAULTS ||
          {};
        window.PrefsStore.apply(prefs);
      }
    } catch (e) {
      console.warn('[Signout] prefs apply error', e);
    }
  }

  function render(container) {
    if (!container) return;
    container.innerHTML = '';

    // Lanza el proceso de signout en segundo plano
    doSignOut();

    var wrap = document.createElement('div');
    wrap.className = 'panel-single';

    wrap.innerHTML = [
      '<h1 class="main-view-title" id="signout-title"></h1>',
      '<p class="signout-message" id="signout-msg"></p>',
    ].join('\n');

    container.appendChild(wrap);

    wrap.querySelector('#signout-title').textContent = t('title');
    wrap.querySelector('#signout-msg').textContent = t('message');

    window.addEventListener('i18n:changed', function () {
      wrap.querySelector('#signout-title').textContent = t('title');
      wrap.querySelector('#signout-msg').textContent = t('message');
    });
  }

  return { render: render };
})();
