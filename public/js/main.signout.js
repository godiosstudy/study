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

    // Forzamos refresco explícito del estado de autenticación y del header,
    // por si algún navegador no dispara correctamente los eventos.
    try {
      if (window.AuthSession && typeof window.AuthSession.refresh === 'function') {
        await window.AuthSession.refresh();
      }
    } catch (e) {
      console.warn('[Signout] auth refresh error', e);
    }

    // Emitimos manualmente el evento auth:changed como fallback
    try {
      if (typeof window !== 'undefined') {
        var ev = null;
        if (typeof window.CustomEvent === 'function') {
          ev = new CustomEvent('auth:changed', { detail: null });
        } else if (typeof Event === 'function') {
          ev = new Event('auth:changed');
        }
        if (ev) window.dispatchEvent(ev);
      }
    } catch (e) {
      console.warn('[Signout] auth:changed event error', e);
    }

    // Forzamos re-render del header (iconos de usuario, bendecido X, etc.)
    try {
      if (window.HeaderButtons && typeof window.HeaderButtons.render === 'function') {
        var container = document.getElementById('hdr-actions');
        if (!container) {
          var hdrRight = document.querySelector('.hdr-right');
          if (hdrRight) {
            container = document.createElement('div');
            container.id = 'hdr-actions';
            hdrRight.appendChild(container);
          }
        }
        if (container) {
          window.HeaderButtons.render(container);
        }
      }
    } catch (e) {
      console.warn('[Signout] header render error', e);
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
