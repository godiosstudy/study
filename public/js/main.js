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

  function setViewTitleFor(name) {
    var pill = document.getElementById("view-title");
    if (!pill) return;
    // Ocultamos la solapa invertida: el título se maneja dentro del main.
    pill.textContent = "";
    pill.style.display = "none";
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
    setViewTitleFor(name);

    clearMain();

    if (name === "navigator") {
      if (
        window.MainNavigator &&
        typeof window.MainNavigator.renderNav === "function"
      ) {
        window.MainNavigator.renderNav(el);
      }
      setTimeout(adjustLayout, 0);
      return;
    }

    if (name === "results") {
      if (
        window.MainResults &&
        typeof window.MainResults.render === "function"
      ) {
        window.MainResults.render(el, currentOptions);
      }
      setTimeout(adjustLayout, 0);
      return;
    }

    if (name === "focus") {
      if (
        window.MainFocus &&
        typeof window.MainFocus.render === "function"
      ) {
        window.MainFocus.render(el, currentOptions);
      }
      setTimeout(adjustLayout, 0);
      return;
    }

    if (name === "preferences") {
      if (
        window.MainPreferences &&
        typeof window.MainPreferences.render === "function"
      ) {
        window.MainPreferences.render(el);
      }
      setTimeout(adjustLayout, 0);
      return;
    }

    if (name === "account") {
      if (
        window.MainAccount &&
        typeof window.MainAccount.render === "function"
      ) {
        window.MainAccount.render(el);
      }
      setTimeout(adjustLayout, 0);
      return;
    }

    if (name === "login") {
      if (window.MainLogin && typeof window.MainLogin.render === "function") {
        window.MainLogin.render(el);
      }
      setTimeout(adjustLayout, 0);
      return;
    }

    if (name === "register") {
      if (
        window.MainRegister &&
        typeof window.MainRegister.render === "function"
      ) {
        window.MainRegister.render(el);
      }
      setTimeout(adjustLayout, 0);
      return;
    }

    if (name === "changelog") {
      if (
        window.MainChangelog &&
        typeof window.MainChangelog.render === "function"
      ) {
        window.MainChangelog.render(el);
      }
      setTimeout(adjustLayout, 0);
      return;
    }

    if (name === "signout") {
      if (
        window.MainSignout &&
        typeof window.MainSignout.render === "function"
      ) {
        window.MainSignout.render(el);
      }
      setTimeout(adjustLayout, 0);
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

  function adjustLayout() {
    try {
      var hdr = document.querySelector(".hdr-wrap");
      var tbar = document.getElementById("app-toolbar");
      var headerOffset = 0;
      if (hdr && hdr.offsetHeight) headerOffset += hdr.offsetHeight;
      if (tbar && tbar.offsetHeight) headerOffset += tbar.offsetHeight;

      if (headerOffset <= 0) {
        // Fallback al valor por defecto (60 + 44)
        headerOffset = 104;
      }

      var title = document.querySelector(".main-view-header");
      var titleH = 0;
      if (title && title.offsetHeight) {
        titleH = title.offsetHeight;
      }
      if (titleH <= 0) {
        // altura mínima razonable del título del main
        titleH = 56;
      }

      if (document.documentElement && document.documentElement.style) {
        var rootStyle = document.documentElement.style;
        rootStyle.setProperty("--main-offset", headerOffset + "px");
        rootStyle.setProperty("--main-title-h", titleH + "px");
      }
    } catch (e) {
      console.warn("[Main] adjustLayout error", e);
    }
  }


  


  function init() {
    // La vista inicial se decidirá después de que las preferencias y la base
    // se hayan cargado (system.bootstrap.prefs.js llamará a Main.showView).
    // Aquí no forzamos ninguna vista para permitir mostrar el mensaje de bienvenida.
    try {
      adjustLayout();
      if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("resize", adjustLayout);
      }
    } catch (e) {
      console.warn("[Main] init/adjustLayout error", e);
    }
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
  };
})();