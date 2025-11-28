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
        'Su sesión ha sido cerrada',
    },
    en: {
      title: 'Sign out',
      message:
      'Your session has been closed.',
    },
  };

  function t(key) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || key;
  }

  // Ejecuta el signout real contra Supabase y re-aplica preferencias locales
  async function doSignOut() {
  // 1) Cerrar sesión en Supabase y limpiar cualquier sesión en memoria
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

  // 2) Limpiar posibles restos en localStorage usados por el header
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth.user');
      localStorage.removeItem('sb-auth-token');
    }
  } catch (e) {
    console.warn('[Signout] localStorage cleanup error', e);
  }

  // 3) Reaplicar preferencias locales (por idioma / estilo) sin sesión
  try {
    if (window.PrefsStore && typeof window.PrefsStore.apply === 'function') {
      var prefs =
        (window.PrefsStore.load && window.PrefsStore.load()) ||
        window.PrefsStore.DEFAULTS ||
        {};
      window.PrefsStore.apply(prefs);
    }
  } catch (e) {
    console.warn('[Signout] prefs apply error', e);
  }

  // 4) Forzar un refresh explícito de AuthSession, por si el adapter lo soporta
  try {
    if (window.AuthSession && typeof window.AuthSession.refresh === 'function') {
      await window.AuthSession.refresh();
    }
  } catch (e) {
    console.warn('[Signout] auth refresh error', e);
  }

  // 5) Emitir un evento auth:changed para que header/buttons se re-rendericen
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

  // 6) Forzar el re-render explícito del header (iconos de login/registro/etc.)
  try {
    if (window.HeaderButtons && typeof window.HeaderButtons.render === 'function') {
      var container = document.getElementById('hdr-actions');
      if (container) {
        window.HeaderButtons.render(container);
      }
    }
  } catch (e) {
    console.warn('[Signout] header render error', e);
  }

  // 7) Mostrar mensaje global en el header y volver a Navigator
  try {
    if (
      window.HeaderMessages &&
      typeof window.HeaderMessages.show === 'function'
    ) {
      window.HeaderMessages.show(t('message'), { duration: 7000 });
    }
  } catch (e) {
    console.warn('[Signout] header message error', e);
  }

  try {
    if (window.Main && typeof window.Main.showView === 'function') {
      window.Main.showView('navigator');
    }
  } catch (e) {
    console.warn('[Signout] navigator redirect error', e);
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
