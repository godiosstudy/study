// main.js – enrutador principal de vistas dentro de <main>
window.Main = (function () {
  var currentView = null;

  // Títulos por vista y por idioma
  var VIEW_TITLES = {
    navigator: { es: 'Navegación', en: 'Navigation' },
    results: { es: 'Resultados de búsqueda', en: 'Search Results' },
    focus: { es: 'Enfoque', en: 'Focus' },
    preferences: { es: 'Preferencias', en: 'Preferences' },
    changelog: { es: 'Historial de cambios', en: 'Changelog' },
    login: { es: 'Iniciar sesión', en: 'Sign in' },
    register: { es: 'Registrarse', en: 'Sign up' },
    forget: { es: 'Recuperar contraseña', en: 'Forgot password' },
    signout: { es: 'Cerrar sesión', en: 'Sign out' },
    account: { es: 'Mi cuenta', en: 'My account' },
  };

  function documentReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function getLang() {
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === 'function') {
        var prefs = window.PrefsStore.load();
        if (prefs && prefs.language) return prefs.language;
      }
    } catch (e) {}
    try {
      var attr = document.documentElement.getAttribute('lang');
      if (attr) return attr;
    } catch (e2) {}
    return 'es';
  }

  function getTitleForView(name) {
    var map = VIEW_TITLES[name];
    if (!map) return '';
    var lang = getLang();
    return map[lang] || map.es || map.en || '';
  }

  function getMainContainer() {
    return document.getElementById('app-main') || document.querySelector('main');
  }

  function setViewTitle(name) {
    var pill = document.getElementById('view-title');
    if (!pill) return;

    var title = getTitleForView(name);
    if (!title) {
      pill.style.display = 'none';
      return;
    }
    pill.textContent = title;
    pill.classList.add('view-title-pill');
    pill.style.display = 'inline-block';
  }

  function clearMain(container) {
    if (!container) return;
    container.innerHTML = '';
  }

  function ensureStudyLayout(container) {
    if (!container) return null;
    if (!window.MainNavigator || typeof window.MainNavigator.ensureLayout !== 'function') {
      return { root: container, nav: container, results: container, focus: container };
    }
    return window.MainNavigator.ensureLayout(container);
  }

  function showView(name, options) {
    options = options || {};
    var container = getMainContainer();
    if (!container) return;

    currentView = name;
    setViewTitle(name);

    var layoutPanels;

    if (name === 'navigator' || name === 'results' || name === 'focus') {
      layoutPanels = ensureStudyLayout(container);
      if (!layoutPanels) return;

      if (name === 'navigator') {
        if (window.MainNavigator && typeof window.MainNavigator.renderNav === 'function') {
          window.MainNavigator.renderNav(layoutPanels.nav, options);
        }
        if (window.MainResults && typeof window.MainResults.render === 'function') {
          window.MainResults.render(layoutPanels.results, options);
        }
        if (window.MainFocus && typeof window.MainFocus.render === 'function') {
          window.MainFocus.render(layoutPanels.focus, options);
        }
      } else if (name === 'results') {
        if (window.MainResults && typeof window.MainResults.render === 'function') {
          window.MainResults.render(layoutPanels.results, options);
        }
      } else if (name === 'focus') {
        if (window.MainFocus && typeof window.MainFocus.render === 'function') {
          window.MainFocus.render(layoutPanels.focus, options);
        }
      }
      return;
    }

    // Vistas de panel único
    clearMain(container);

    var viewMap = {
      changelog: window.MainChangelog,
      preferences: window.MainPreferences,
      register: window.MainRegister,
      login: window.MainLogin,
      forget: window.MainForget,
      signout: window.MainSignout,
      account: window.MainAccount,
    };

    var mod = viewMap[name];
    if (mod && typeof mod.render === 'function') {
      mod.render(container, options);
    } else {
      var div = document.createElement('div');
      div.className = 'panel-single';
      div.innerHTML =
        '<h1>Not implemented</h1><p>View "' + String(name) + '" has no renderer yet.</p>';
      container.appendChild(div);
    }
  }

  function getCurrentView() {
    return currentView;
  }

  function init() {
    showView('navigator');
  }

  documentReady(init);

  // Cuando cambie el idioma, actualizamos el título de la vista actual
  window.addEventListener('i18n:changed', function () {
    if (currentView) setViewTitle(currentView);
  });

  return {
    showView: showView,
    getCurrentView: getCurrentView,
  };
})();
