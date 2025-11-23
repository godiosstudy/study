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
      }

      // Mientras cargamos, ocultamos visualmente el resto de la app
      try {
        if (document.body && document.body.classList) {
          document.body.classList.add("app-loading");
        }
      } catch (eBody) {}

      // Mostrar loader de pantalla completa
      if (window.SystemLoader && typeof window.SystemLoader.show === "function") {
        window.SystemLoader.show();
      }
      if (window.SystemLoader && typeof window.SystemLoader.setProgress === "function") {
        var lang = "es";
        try {
          var store = getStore && getStore();
          if (store && typeof store.load === "function") {
            var p = store.load() || {};
            if (p.language) lang = p.language;
          }
        } catch (ePrefs) {}
        var label = lang === "en" ? "Loading" : "Cargando";
        window.SystemLoader.setProgress(0, label);
      }
    } catch (e) {}
  }

  function hideLoader() {
    try {
      // Ocultar overlay de carga de pantalla completa
      if (window.SystemLoader && typeof window.SystemLoader.hide === "function") {
        window.SystemLoader.hide();
      }

      // Volver a mostrar el resto de la app
      try {
        if (document.body && document.body.classList) {
          document.body.classList.remove("app-loading");
        }
      } catch (eBody) {}

      // Al terminar la primera carga, mostramos breadcrumb
      if (window.BootstrapState && window.BootstrapState.firstLoad) {
        var bc = document.getElementById("tbar-breadcrumb");
        if (bc) {
          bc.style.visibility = "";
        }

        window.BootstrapState.firstLoad = false;
      }
    } catch (e) {}
  }

  async function loadBibleCache(prefs) {
    if (!prefs) return;

    try {
      var lang = (prefs && prefs.language) || "es";

      if (window.EntriesMemory && typeof window.EntriesMemory.loadForPrefs === "function") {
        await window.EntriesMemory.loadForPrefs(prefs, function (pct, snippet) {
          try {
            if (window.SystemLoader && typeof window.SystemLoader.setProgress === "function") {
              // Dejamos que SystemLoader construya el texto base (Cargando / Loading + %)
              window.SystemLoader.setProgress(pct, "");
            }
          } catch (e) {}
        });
      }

      // Además, precargamos en memoria las colecciones y corpus disponibles para este idioma,
      // pero lo hacemos en segundo plano para no retrasar la carga inicial.
      try {
        if (window.EntriesMemory && typeof window.EntriesMemory.preloadMetaForLang === "function") {
          // llamada sin await: se ejecuta en background
          window.EntriesMemory.preloadMetaForLang(lang);
        }
      } catch (eMeta) {
        console.warn("[BootstrapPrefs] error precargando meta de entries", eMeta);
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

    // Base de preferencias: lo que haya en store o los DEFAULTS
    var prefs =
      (store && typeof store.load === "function" && store.load()) ||
      (store && store.DEFAULTS) ||
      {};
    prefs.language = lang;

    // Si no hay cliente Supabase, no podemos leer entries todavía.
    // Aplicamos solo idioma y dejamos que el resto de la app funcione,
    // igual que antes.
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

    // 1) Intentar obtener collection/corpus desde la PRIMERA fila de entries
    var collection = prefs.collection || null;
    var corpus = prefs.corpus || null;

    if (!collection || !corpus) {
      try {
        var firstRes = await client
          .from("entries")
          .select("level_1, level_2")
          .eq("language_code", lang)
          .order("entry_order", { ascending: true })
          .limit(1);

        if (!firstRes.error && firstRes.data && firstRes.data.length) {
          var row0 = firstRes.data[0] || {};
          collection = collection || row0.level_1 || null;
          corpus = corpus || row0.level_2 || null;
        }
      } catch (e) {
        console.warn("[BootstrapPrefs] entries first row error", e);
      }
    }

    // 2) Fallback suave a entries_meta si sigue faltando algo
    if (!collection || !corpus) {
      try {
        var resL1 = await client
          .from("entries_meta")
          .select("level_1")
          .eq("language_code", lang)
          .order("level_1", { ascending: true })
          .limit(1);

        if (!resL1.error && resL1.data && resL1.data.length) {
          collection = collection || resL1.data[0].level_1 || null;
        }
      } catch (e) {
        console.warn("[BootstrapPrefs] entries level_1 error", e);
      }

      if (collection) {
        try {
          var resL2 = await client
            .from("entries_meta")
            .select("level_2")
            .eq("language_code", lang)
            .eq("level_1", collection)
            .order("level_2", { ascending: true })
            .limit(1);

          if (!resL2.error && resL2.data && resL2.data.length) {
            corpus = corpus || resL2.data[0].level_2 || null;
          }
        } catch (e) {
          console.warn("[BootstrapPrefs] entries level_2 error", e);
        }
      }
    }

    prefs.collection = collection;
    prefs.corpus = corpus;

    // 3) Inicializar breadcrumb (ToolbarState) usando el primer versículo del corpus
    if (client && collection && corpus) {
      try {
        var verseRes = await client
          .from("entries")
          .select("level_3, level_4, level_5, level_7, entry_order")
          .eq("language_code", lang)
          .eq("level_1", collection)
          .eq("level_2", corpus)
          .order("entry_order", { ascending: true })
          .limit(1);

        if (!verseRes.error && verseRes.data && verseRes.data.length) {
          var v0 = verseRes.data[0] || {};
          var l3 = v0.level_3 || null;
          var l4 = v0.level_4 || null;
          var l5 = v0.level_5 || v0.level_7 || null;

          if (l3 && l4 && l5) {
            window.ToolbarState = window.ToolbarState || {};
            if (!window.ToolbarState.level_3) window.ToolbarState.level_3 = l3;
            if (!window.ToolbarState.level_4) window.ToolbarState.level_4 = l4;
            if (!window.ToolbarState.level_5) window.ToolbarState.level_5 = l5;
          }
        }
      } catch (e) {
        console.warn("[BootstrapPrefs] error inicializando breadcrumb por defecto", e);
      }
    }

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
  async function afterBibleLoaded(prefs) {
    // Pre-cargar colecciones/corpus para Preferencias durante el loader
    try {
      if (window.MainPreferences && typeof window.MainPreferences.preloadCollections === "function") {
        await window.MainPreferences.preloadCollections();
      }
    } catch (e) {
      console.warn("[BootstrapPrefs] preloadCollections error", e);
    }

    try {
      if (window.Toolbar && typeof window.Toolbar.refreshBreadcrumb === "function") {
        window.Toolbar.refreshBreadcrumb();
      }
    } catch (e) {}
  }

function showInitialView() {
    try {
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("navigator");
      }
    } catch (e) {}
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
        await afterBibleLoaded(prefs);
        showInitialView();
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
          prefs =
            (store && typeof store.load === "function" && store.load()) || {};
        } catch (e) {
          console.warn("[BootstrapPrefs] error leyendo prefs locales", e);
          prefs = {};
        }

        // Si las prefs locales no tienen collection/corpus, las completamos
        // con la lógica basada en entries.
        if (!prefs.collection || !prefs.corpus) {
          prefs = await step3_DefaultFromEntries(store);
        } else {
          try {
            if (store && typeof store.apply === "function") {
              store.apply(prefs);
            }
            ensureDomLang((prefs && prefs.language) || "es");
            dispatchPrefsApplied(prefs);
          } catch (e) {
            console.warn("[BootstrapPrefs] error aplicando prefs locales", e);
          }
        }

        await loadBibleCache(prefs);
        await afterBibleLoaded(prefs);
        showInitialView();
        return;
      }

      // 3) No hay usuario ni prefs locales → mirar entries
      prefs = await step3_DefaultFromEntries(store);
      await loadBibleCache(prefs);
      await afterBibleLoaded(prefs);
      showInitialView();
    } finally {
      hideLoader();
    }
  }
  documentReady(function () {
    bootstrap();
  });
})();