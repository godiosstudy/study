// header.buttons.js – gestiona los botones de usuario (lado derecho del header)
window.HeaderButtons = (function () {
  var CONTAINER_ID = "hdr-actions";
  var bus = window;

  function documentReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function getLang() {
    try {
      var store = window.PrefsStore;
      if (store && typeof store.load === "function") {
        var prefs = store.load();
        if (prefs && prefs.language) return prefs.language;
      }
    } catch (e) {}
    return "es";
  }

  function t(key) {
    var lang = getLang();
    var ES = {
      login: "Iniciar sesión",
      register: "Registrarse",
      account: "Mi cuenta",
      signout: "Cerrar sesión",
      preferences: "Preferencias",
    };
    var EN = {
      login: "Sign in",
      register: "Sign up",
      account: "My account",
      signout: "Sign out",
      preferences: "Preferences",
    };
    var dict = lang === "en" ? EN : ES;
    return dict[key] || key;
  }

  function isLoggedIn() {
    if (window.AuthSession && typeof window.AuthSession.isLoggedIn === "function") {
      return window.AuthSession.isLoggedIn();
    }
    // fallback básico: token en localStorage
    return !!localStorage.getItem("auth.user");
  }

  function showView(name) {
    if (window.Main && typeof window.Main.showView === "function") {
      window.Main.showView(name);
    }
  }

  function createChip(icon, textKey, onClick, id) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip icon-only";
    if (id) btn.id = id;

    var iconEl = document.createElement("i");
    iconEl.setAttribute("data-lucide", icon);
    btn.appendChild(iconEl);

    var label = t(textKey);
    btn.setAttribute("aria-label", label);
    btn.title = label;

    if (typeof onClick === "function") {
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        onClick();
      });
    }

    return btn;
  }

  function render(container) {
    if (!container) return;
    container.innerHTML = "";
    container.classList.add("hdr-actions");

    if (isLoggedIn()) {
      container.appendChild(
        createChip("user", "account", function () {
          showView("account");
        }, "hdr-account")
      );
      container.appendChild(
        createChip("log-out", "signout", function () {
          showView("signout");
        }, "hdr-signout")
      );
    } else {
      container.appendChild(
        createChip("user-lock", "login", function () {
          showView("login");
        }, "hdr-login")
      );
      container.appendChild(
        createChip("user-plus", "register", function () {
          showView("register");
        }, "hdr-register")
      );
    }

    container.appendChild(
      createChip("settings", "preferences", function () {
        showView("preferences");
      }, "hdr-preferences")
    );

    // regenerar iconos lucide
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function init() {
    var container = document.getElementById(CONTAINER_ID);
    if (!container) {
      var hdrRight = document.querySelector(".hdr-right");
      if (hdrRight) {
        container = document.createElement("div");
        container.id = CONTAINER_ID;
        hdrRight.appendChild(container);
      }
    }
    render(container);
  }

  documentReady(init);

  // cuando cambien prefs o idioma, re-render para actualizar tooltips
  bus.addEventListener("prefs:applied", function () {
    var container = document.getElementById(CONTAINER_ID);
    if (container) render(container);
  });
  bus.addEventListener("i18n:changed", function () {
    var container = document.getElementById(CONTAINER_ID);
    if (container) render(container);
  });

  return {
    init: init,
    render: render,
  };
})();
