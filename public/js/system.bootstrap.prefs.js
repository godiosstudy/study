// system.bootstrap.prefs.js
// Inicializa las preferencias del sistema al arrancar la app.
(function () {
  function documentReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function getStore() {
    try {
      return window.PrefsStore || window.SystemPrefsStore || null;
    } catch (e) {
      return null;
    }
  }

  function getSupabaseClient() {
    try {
      if (
        window.BackendSupabase &&
        typeof window.BackendSupabase.client === "function"
      ) {
        return window.BackendSupabase.client();
      }
    } catch (e) {
      console.warn("[BootstrapPrefs] error obteniendo cliente Supabase", e);
    }
    return null;
  }

  function getDeviceLang() {
    var navLang = "en";
    try {
      if (navigator && navigator.language) {
        navLang = String(navigator.language || "").toLowerCase();
      }
    } catch (e) {}

    if (navLang.indexOf("es") === 0) return "es";
    return "en";
  }

  function ensureDomLang(lang) {
    if (!lang) return;
    try {
      if (
        window.SystemLanguage &&
        typeof window.SystemLanguage.setCurrent === "function"
      ) {
        window.SystemLanguage.setCurrent(lang);
      } else {
        document.documentElement.setAttribute("lang", lang);
      }
    } catch (e) {}
  }

  function dispatchPrefsApplied(prefs) {
    try {
      window.dispatchEvent(
        new CustomEvent("prefs:applied", { detail: prefs || {} })
      );
    } catch (e) {}
  }

  function showLoader() {
    try {
      // Estado global para saber si es la primera carga del sitio
      window.BootstrapState = window.BootstrapState || {};
      if (typeof window.BootstrapState.firstLoad === "undefined") {
        window.BootstrapState.firstLoad = true;
      }

      var isFirst = !!window.BootstrapState.firstLoad;

      if (isFirst) {
        // Ocultar breadcrumb hasta que termine la primera carga
        var bc = document.getElementById("tbar-breadcrumb");
        if (bc) {
          bc.style.visibility = "hidden";
        }

        // Mensaje de bienvenida en el centro del main
        var main = document.getElementById("app-main");
        if (main) {
          var overlay = document.getElementById("startup-welcome");
          if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "startup-welcome";
            overlay.className = "startup-welcome";
            main.appendChild(overlay);
          } else {
            overlay.innerHTML = "";
          }

          // Idioma para el mensaje
          var lang = "es";
          try {
            var store = getStore && getStore();
            if (store && typeof store.load === "function") {
              var p = store.load() || {};
              if (p.language) lang = p.language;
            }
          } catch (ePrefs) {}

          var line1 = document.createElement("div");
          line1.className = "startup-welcome-line1";
          line1.textContent = lang === "en" ? "Welcome to" : "Bienvenido a";

          var line2 = document.createElement("div");
          line2.className = "startup-welcome-line2";
          line2.textContent = lang === "en" ? "Study.GODiOS.org" : "Estudio.GODiOS.org";

          overlay.appendChild(line1);
          overlay.appendChild(line2);
        }
      }

      // El cargador principal ahora es el del footer.
      if (window.FooterLoader && typeof window.FooterLoader.show === "function") {
        // Lo iniciamos en 0%; el detalle real lo marcará loadBibleCache.
        window.FooterLoader.show(0, "", null);
      }
    } catch (e) {}
  }

  function hideLoader() {
    try {
      if (window.FooterLoader && typeof window.FooterLoader.hide === "function") {
        window.FooterLoader.hide();
      }

      // Al terminar la primera carga, mostramos breadcrumb y quitamos mensaje
      if (window.BootstrapState && window.BootstrapState.firstLoad) {
        var bc = document.getElementById("tbar-breadcrumb");
        if (bc) {
          bc.style.visibility = "";
        }

        var overlay = document.getElementById("startup-welcome");
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }

        window.BootstrapState.firstLoad = false;
      }
    } catch (e) {}
  }

  async function loadBibleCache(prefs) {
    if (!prefs) return;

    try {
      var lang = (prefs && prefs.language) || "es";

      // El progreso detallado se muestra solo en el footer.
      if (window.FooterLoader && typeof window.FooterLoader.show === "function") {
        window.FooterLoader.show(0, "", lang);
      }

      if (window.EntriesMemory && typeof window.EntriesMemory.loadForPrefs === "function") {
        await window.EntriesMemory.loadForPrefs(prefs, function (pct, snippet) {
          try {
            if (window.FooterLoader && typeof window.FooterLoader.setProgress === "function") {
              window.FooterLoader.setProgress(pct, snippet, lang);
            }
          } catch (e) {}
        });
      }
    } catch (e) {
      console.warn("[BootstrapPrefs] error precargando entries en memoria", e);
    }
  }


  function ptFromSqlFontSize(v) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return 12;
    if (n < 8) n = 8;
    if (n > 25) n = 25;
    return n;
  }

  function hasUserPrefs(profileRow) {
    if (!profileRow) return false;
    return !!(
      profileRow.p_color ||
      profileRow.p_font_type ||
      profileRow.p_font_size ||
      profileRow.p_language ||
      profileRow.p_level_1 ||
      profileRow.p_level_2 ||
      typeof profileRow.p_light === "boolean"
    );
  }

  function mergeProfileIntoPrefs(profileRow, sitePrefs) {
    var merged = {};
    for (var k in sitePrefs) {
      if (Object.prototype.hasOwnProperty.call(sitePrefs, k)) {
        merged[k] = sitePrefs[k];
      }
    }

    if (profileRow.p_language) merged.language = profileRow.p_language;
    if (profileRow.p_font_type) merged.font = profileRow.p_font_type;
    if (profileRow.p_font_size != null) {
      merged.fontSizePt = ptFromSqlFontSize(profileRow.p_font_size);
    }
    if (typeof profileRow.p_light === "boolean") {
      merged.light = profileRow.p_light ? "on" : "off";
    }
    if (profileRow.p_color) {
      var hex = String(profileRow.p_color).trim();
      if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
        merged.colorHex = "#" + hex.toUpperCase();
      }
    }
    if (profileRow.p_level_1) merged.collection = profileRow.p_level_1;
    if (profileRow.p_level_2) merged.corpus = profileRow.p_level_2;

    return merged;
  }

  async function step1_UserProfile(store) {
    if (!window.AuthSession || !window.AuthSession.refresh) return null;

    try {
      await window.AuthSession.refresh();
    } catch (e) {
      console.warn("[BootstrapPrefs] error refrescando sesión", e);
    }

    try {
      if (
        !window.AuthSession.isLoggedIn ||
        !window.AuthSession.isLoggedIn()
      ) {
        return null;
      }
    } catch (e) {
      return null;
    }

    var client = getSupabaseClient();
    if (!client) return null;

    var user = null;
    try {
      user =
        window.AuthSession && typeof window.AuthSession.getUser === "function"
          ? window.AuthSession.getUser()
          : null;
    } catch (e) {}
    if (!user || !user.id) return null;

    var sitePrefs =
      (store && typeof store.load === "function" && store.load()) ||
      (store && store.DEFAULTS) ||
      {};

    var profileRow = null;
    try {
      var res = await client
        .from("profiles")
        .select(
          "id, email, first_name, last_name, p_color, p_font_type, p_font_size, p_light, p_language, p_level_1, p_level_2"
        )
        .eq("id", user.id);

      if (!res.error && res.data && res.data.length) {
        profileRow = res.data[0];
      }
    } catch (e) {
      console.warn("[BootstrapPrefs] profiles select error", e);
    }

    if (!hasUserPrefs(profileRow)) {
      return null;
    }

    var merged = mergeProfileIntoPrefs(profileRow, sitePrefs);

    try {
      if (store && typeof store.save === "function") {
        merged = store.save(merged);
      }
      if (store && typeof store.apply === "function") {
        store.apply(merged);
      }
      ensureDomLang(merged.language || "es");
      dispatchPrefsApplied(merged);
    } catch (e) {
      console.warn("[BootstrapPrefs] error aplicando prefs de usuario", e);
    }

    return merged;
  }

  async function step3_DefaultFromEntries(store) {
    var client = getSupabaseClient();
    var lang = getDeviceLang();

    var prefs =
      (store && typeof store.load === "function" && store.load()) ||
      (store && store.DEFAULTS) ||
      {};
    prefs.language = lang;

    if (!client) {
      try {
        if (store && typeof store.save === "function") {
          prefs = store.save(prefs);
        }
        if (store && typeof store.apply === "function") {
          store.apply(prefs);
        }
        ensureDomLang(prefs.language || "es");
        dispatchPrefsApplied(prefs);
      } catch (e) {
        console.warn("[BootstrapPrefs] error aplicando prefs por defecto", e);
      }
      return prefs;
    }

    var collection = null;
    var corpus = null;

    try {
      var resL1 = await client
        .from("entries")
        .select("level_1")
        .eq("language_code", lang)
        .not("level_1", "is", null)
        .order("level_1", { ascending: true })
        .limit(1);

      if (!resL1.error && resL1.data && resL1.data.length) {
        collection = resL1.data[0].level_1 || null;
      }
    } catch (e) {
      console.warn("[BootstrapPrefs] entries level_1 error", e);
    }

    if (collection) {
      try {
        var resL2 = await client
          .from("entries")
          .select("level_2")
          .eq("language_code", lang)
          .eq("level_1", collection)
          .not("level_2", "is", null)
          .order("level_2", { ascending: true })
          .limit(1);

        if (!resL2.error && resL2.data && resL2.data.length) {
          corpus = resL2.data[0].level_2 || null;
        }
      } catch (e) {
        console.warn("[BootstrapPrefs] entries level_2 error", e);
      }
    }

    prefs.collection = prefs.collection || collection;
    prefs.corpus = prefs.corpus || corpus;

    try {
      if (store && typeof store.save === "function") {
        prefs = store.save(prefs);
      }
      if (store && typeof store.apply === "function") {
        store.apply(prefs);
      }
      ensureDomLang(prefs.language || "es");
      dispatchPrefsApplied(prefs);
    } catch (e) {
      console.warn("[BootstrapPrefs] error aplicando prefs de entries", e);
    }

    return prefs;
  }

  async function bootstrap() {
    var store = getStore();
    if (!store) return;

    showLoader();

    try {
      var prefs = null;

      // 1) Usuario logueado → perfil
      prefs = await step1_UserProfile(store);
      if (prefs) {
        await loadBibleCache(prefs);
        try {
          if (window.Toolbar && typeof window.Toolbar.refreshBreadcrumb === "function") {
            window.Toolbar.refreshBreadcrumb();
          }
        } catch (e) {}
        return;
      }

      // 2) Preferencias locales previas
      var hasLocal = false;
      try {
        if (typeof store.hasLocalPrefs === "function") {
          hasLocal = store.hasLocalPrefs();
        }
      } catch (e) {}

      if (hasLocal) {
        try {
          prefs = store.load();
          if (store && typeof store.apply === "function") {
            store.apply(prefs);
          }
          ensureDomLang((prefs && prefs.language) || "es");
          dispatchPrefsApplied(prefs);
        } catch (e) {
          console.warn("[BootstrapPrefs] error aplicando prefs locales", e);
        }
        await loadBibleCache(prefs);
        try {
          if (window.Toolbar && typeof window.Toolbar.refreshBreadcrumb === "function") {
            window.Toolbar.refreshBreadcrumb();
          }
        } catch (e) {}
        return;
      }

      // 3) No hay usuario ni prefs locales → mirar entries
      prefs = await step3_DefaultFromEntries(store);
      await loadBibleCache(prefs);

      try {
        if (window.Toolbar && typeof window.Toolbar.refreshBreadcrumb === "function") {
          window.Toolbar.refreshBreadcrumb();
        }
      } catch (e) {}
    } finally {
      hideLoader();
    }
  }

  documentReady(function () {
    bootstrap();
  });
})();
