// header.buttons.js – gestiona los botones de usuario (lado derecho del header)
// y muestra "Bendecido X" / "Blessed X" + stats (credits/steps/floor) con badge.
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

  // =========================
  // Idioma desde preferencias
  // =========================
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
      blessedPrefix: "Bendecido ",
      creditsLabel: "Créditos",
      stepsLabel: "Escalones",   // <- antes "Pasos"
      floorLabel: "Piso",        // <- antes "Piso / Nivel"
    };
    var EN = {
      login: "Sign in",
      register: "Sign up",
      account: "My account",
      signout: "Sign out",
      preferences: "Preferences",
      blessedPrefix: "Blessed ",
      creditsLabel: "Credits",
      stepsLabel: "Steps",
      floorLabel: "Floor",
    };
    var dict = lang === "en" ? EN : ES;
    return dict[key] || key;
  }

  // =========================
  // Estado de sesión
  // =========================
  function isLoggedIn() {
    if (
      window.AuthSession &&
      typeof window.AuthSession.isLoggedIn === "function"
    ) {
      return window.AuthSession.isLoggedIn();
    }
    try {
      return !!localStorage.getItem("auth.user");
    } catch (e) {
      return false;
    }
  }

  function getCurrentUser() {
    try {
      if (
        window.AuthSession &&
        typeof window.AuthSession.getUser === "function"
      ) {
        return window.AuthSession.getUser();
      }
    } catch (e) {}
    return null;
  }

  function getCurrentUserName() {
    var u = getCurrentUser();
    if (!u) return "";
    try {
      var meta = u.user_metadata || {};
      if (meta.first_name) return meta.first_name;
      if (meta.last_name) return meta.last_name;
      if (u.email) return u.email.split("@")[0];
    } catch (e) {}
    return "";
  }

  // =========================
  // Navegación
  // =========================
  function showView(name) {
    if (window.Main && typeof window.Main.showView === "function") {
      window.Main.showView(name);
    }
  }

  // =========================
  // Supabase (floor/steps/credits)
  // =========================
  function getSupabaseClient() {
    try {
      if (
        window.BackendSupabase &&
        typeof window.BackendSupabase.client === "function" &&
        typeof window.BackendSupabase.isConfigured === "function" &&
        window.BackendSupabase.isConfigured()
      ) {
        return window.BackendSupabase.client();
      }
    } catch (e) {
      console.warn("[HeaderButtons] error obteniendo cliente Supabase", e);
    }
    return null;
  }

  function loadUserStats() {
    var client = getSupabaseClient();
    if (!client) return;

    var user = getCurrentUser();
    if (!user || !user.id) return;

    var cols = "floor, steps, credits";
    var query = client
      .from("profiles")
      .select(cols)
      .eq("id", user.id)
      .limit(1);

    var promise;
    if (query && typeof query.maybeSingle === "function") {
      promise = query.maybeSingle();
    } else if (query && typeof query.single === "function") {
      promise = query.single();
    } else {
      promise = query;
    }

    if (!promise || typeof promise.then !== "function") {
      return;
    }

    promise
      .then(function (res) {
        if (!res) return;
        if (res.error) {
          console.warn("[HeaderButtons] error leyendo stats", res.error);
          return;
        }
        var row = res.data || {};

        var floor = row.floor || "0";
        var steps = row.steps || "0";
        var credits = row.credits || "0";

        var elCredits = document.getElementById("hdr-credits");
        var elSteps = document.getElementById("hdr-steps");
        var elFloor = document.getElementById("hdr-floor");

        if (elCredits) elCredits.textContent = String(credits);
        if (elSteps) elSteps.textContent = String(steps);
        if (elFloor) elFloor.textContent = String(floor);
      })
      .catch(function (err) {
        console.warn("[HeaderButtons] error en load stats", err);
      });
  }

  // =========================
  // UI helpers
  // =========================
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

  function createBlessedLabel() {
    var span = document.createElement("span");
    span.className = "hdr-blessed-label";

    var name = getCurrentUserName();
    var prefix = t("blessedPrefix");

    var prefixNode = document.createElement("span");
    prefixNode.textContent = prefix;

    var nameNode = document.createElement("strong");
    nameNode.textContent = name || "";

    span.appendChild(prefixNode);
    span.appendChild(nameNode);

    return span;
  }

  // Icono + badge superpuesto a la derecha
  function createStatChip(idBadge, iconName, labelKey) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip icon-only hdr-stat-chip";
    btn.disabled = true; // informativo

    var iconEl = document.createElement("i");
    iconEl.setAttribute("data-lucide", iconName);
    btn.appendChild(iconEl);

    var badge = document.createElement("span");
    badge.className = "hdr-stat-badge";
    badge.id = idBadge;
    badge.textContent = "0";
    btn.appendChild(badge);

    var label = t(labelKey);
    btn.title = label;
    btn.setAttribute("aria-label", label);

    return btn;
  }

  // =========================
  // Render
  // =========================
  function render(container) {
    if (!container) return;
    container.innerHTML = "";
    container.classList.add("hdr-actions");

    if (isLoggedIn()) {
      var blessed = createBlessedLabel();
      container.appendChild(blessed);

      // stats
      container.appendChild(
        createStatChip("hdr-credits", "star", "creditsLabel")
      );
      container.appendChild(
        createStatChip("hdr-steps", "trending-up", "stepsLabel")
      );
      container.appendChild(
        createStatChip("hdr-floor", "layers", "floorLabel")
      );

      container.appendChild(
        createChip(
          "user",
          "account",
          function () {
            showView("account");
          },
          "hdr-account"
        )
      );
      container.appendChild(
        createChip(
          "log-out",
          "signout",
          function () {
            showView("signout");
          },
          "hdr-signout"
        )
      );

      loadUserStats();
    } else {
      container.appendChild(
        createChip(
          "user-lock",
          "login",
          function () {
            showView("login");
          },
          "hdr-login"
        )
      );
      container.appendChild(
        createChip(
          "user-plus",
          "register",
          function () {
            showView("register");
          },
          "hdr-register"
        )
      );
    }

    container.appendChild(
      createChip(
        "settings",
        "preferences",
        function () {
          showView("preferences");
        },
        "hdr-preferences"
      )
    );

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

  bus.addEventListener("prefs:applied", function () {
    var container = document.getElementById(CONTAINER_ID);
    if (container) render(container);
  });

  bus.addEventListener("i18n:changed", function () {
    var container = document.getElementById(CONTAINER_ID);
    if (container) render(container);
  });

  bus.addEventListener("auth:changed", function () {
    var container = document.getElementById(CONTAINER_ID);
    if (container) render(container);
  });

  return {
    init: init,
    render: render,
  };
})();
