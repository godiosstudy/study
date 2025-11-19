// main.js – controlador de vistas principales (navigator / results / focus / etc.)
window.Main = (function () {
  var currentView = null;
  var currentOptions = null;

  function getMainEl() {
    return document.getElementById("app-main");
  }

  function clearMain() {
    var el = getMainEl();
    if (el) el.innerHTML = "";
  }

  function getLang() {
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === "function") {
        var prefs = window.PrefsStore.load() || {};
        return prefs.language || "es";
      }
    } catch (e) {}
    return "es";
  }

  
  function renderMainTitle(container, text) {
    if (!container) return;
    var existing = container.querySelector(".main-title-card");
    if (existing && existing.parentNode === container) {
      container.removeChild(existing);
    }
    var card = document.createElement("div");
    card.className = "main-title-card";
    var label = document.createElement("div");
    label.className = "main-title-text";
    label.textContent = text || "";
    card.appendChild(label);
    if (container.firstChild) {
      container.insertBefore(card, container.firstChild);
    } else {
      container.appendChild(card);
    }
  }

  function setDefaultTitleForView(name, container) {
    if (!container) return;
    var lang = getLang();
    var text = "";

    // Estas vistas tienen título estático (los demás lo definen desde su propio módulo)
    if (name === "preferences") {
      text = lang === "en" ? "Preferences" : "Preferencias";
    } else if (name === "account") {
      text = lang === "en" ? "Account" : "Cuenta";
    } else if (name === "login") {
      text = lang === "en" ? "Sign in" : "Iniciar sesión";
    } else if (name === "register") {
      text = lang === "en" ? "Sign up" : "Registrarse";
    } else if (name === "changelog") {
      text = "Changelog";
    } else if (name === "signout") {
      text = lang === "en" ? "Sign out" : "Cerrar sesión";
    } else if (name === "forget") {
      text = lang === "en" ? "Recover password" : "Recordar contraseña";
    }

    if (text) {
      renderMainTitle(container, text);
    }
  }


  function showView(name, options) {
    var el = getMainEl();
    if (!el) {
      console.warn("[Main] #app-main no encontrado");
      return;
    }

    currentView = name;
    currentOptions = options || {};

    // Título base según vista (las vistas pueden sobreescribirlo)
    setDefaultTitleForView(name, el);

    clearMain();

    if (name === "navigator") {
      if (
        window.MainNavigator &&
        typeof window.MainNavigator.renderNav === "function"
      ) {
        window.MainNavigator.renderNav(el);
      }
      return;
    }

    if (name === "results") {
      if (
        window.MainResults &&
        typeof window.MainResults.render === "function"
      ) {
        window.MainResults.render(el, currentOptions);
      }
      return;
    }

    if (name === "focus") {
      if (
        window.MainFocus &&
        typeof window.MainFocus.render === "function"
      ) {
        window.MainFocus.render(el, currentOptions);
      }
      return;
    }

    if (name === "preferences") {
      if (
        window.MainPreferences &&
        typeof window.MainPreferences.render === "function"
      ) {
        window.MainPreferences.render(el);
      }
      return;
    }

    if (name === "account") {
      if (
        window.MainAccount &&
        typeof window.MainAccount.render === "function"
      ) {
        window.MainAccount.render(el);
      }
      return;
    }

    if (name === "login") {
      if (window.MainLogin && typeof window.MainLogin.render === "function") {
        window.MainLogin.render(el);
      }
      return;
    }

    if (name === "register") {
      if (
        window.MainRegister &&
        typeof window.MainRegister.render === "function"
      ) {
        window.MainRegister.render(el);
      }
      return;
    }

    if (name === "changelog") {
      if (
        window.MainChangelog &&
        typeof window.MainChangelog.render === "function"
      ) {
        window.MainChangelog.render(el);
      }
      return;
    }

    if (name === "signout") {
      if (
        window.MainSignout &&
        typeof window.MainSignout.render === "function"
      ) {
        window.MainSignout.render(el);
      }
      return;
    }

    console.warn("[Main] vista desconocida:", name);
  }

  function getCurrentView() {
    return currentView;
  }

  function getCurrentOptions() {
    return currentOptions;
  }

  function init() {
    var started = false;

    function start() {
      if (started) return;
      started = true;
      showView("navigator");
    }

    window.addEventListener("prefs:applied", function () {
      start();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    showView: showView,
    getCurrentView: getCurrentView,
    getCurrentOptions: getCurrentOptions,
    renderTitle: renderMainTitle,
  };
})();
