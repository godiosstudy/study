// main.navigator.js – lista de level_6 / level_7 según breadcrumb + navegación con flechas
window.MainNavigator = (function () {
  function getPrefs() {
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === "function") {
        return window.PrefsStore.load() || {};
      }
    } catch (e) {}
    return {};
  }

  function getLang() {
    var prefs = getPrefs();
    return prefs.language || "es";
  }

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
      console.warn("[Navigator] error obteniendo cliente Supabase", e);
    }
    return null;
  }

  // ======================
  // Helpers de carga
  // ======================

  // Versículos (level_6 / 7) para la combinación actual
  async function loadLevel6_7(filters) {
    var allRows = [];
    try {
      if (window.EntriesMemory && typeof window.EntriesMemory.getRows === "function") {
        allRows = window.EntriesMemory.getRows() || [];
      }
    } catch (e) {
      console.warn("[Navigator] EntriesMemory.getRows error", e);
    }
    if (!allRows.length) return [];

    var map = new Map();

    allRows.forEach(function (row) {
      if (filters.language_code && row.language_code !== filters.language_code) return;
      if (filters.level_1 && row.level_1 !== filters.level_1) return;
      if (filters.level_2 && row.level_2 !== filters.level_2) return;
      if (filters.level_3 && row.level_3 !== filters.level_3) return;
      if (filters.level_4 && row.level_4 !== filters.level_4) return;
      if (filters.level_5 && row.level_5 !== filters.level_5) return;

      var l6 = row.level_6 || "";
      var l7 = row.level_7 || "";
      if (!l6 && !l7) return;

      var key = l6 + "||" + l7;
      var order =
        typeof row.entry_order === "number"
          ? row.entry_order
          : Number.MAX_SAFE_INTEGER;

      var existing = map.get(key);
      if (!existing || order < existing.order) {
        map.set(key, { level_6: l6, level_7: l7, order: order });
      }
    });

    var items = Array.from(map.values());

    items.sort(function (a, b) {
      var n1 = parseInt(a.level_6, 10);
      var n2 = parseInt(b.level_6, 10);
      var bothNumeric = !isNaN(n1) && !isNaN(n2);
      if (bothNumeric && n1 !== n2) return n1 - n2;

      var diff = a.order - b.order;
      if (diff !== 0) return diff;

      return String(a.level_7 || "").localeCompare(String(b.level_7 || ""));
    });

    return items;
  }

  // Lista de libros (level_4) para la colección/corpus/nivel 3 actuales
  async function loadChaptersList(ctx) {
    var allRows = [];
    try {
      if (window.EntriesMemory && typeof window.EntriesMemory.getRows === "function") {
        allRows = window.EntriesMemory.getRows() || [];
      }
    } catch (e) {
      console.warn("[Navigator] EntriesMemory.getRows error (chapters)", e);
    }
    if (!allRows.length) return [];

    var map = new Map();

    allRows.forEach(function (row) {
      if (row.language_code !== ctx.language_code) return;
      if (row.level_1 !== ctx.level_1) return;
      if (row.level_2 !== ctx.level_2) return;
      if (row.level_3 !== ctx.level_3) return;

      var l4 = row.level_4;
      if (!l4) return;
      var key = String(l4);
      var order =
        typeof row.entry_order === "number"
          ? row.entry_order
          : Number.MAX_SAFE_INTEGER;

      var existing = map.get(key);
      if (!existing || order < existing.order) {
        map.set(key, { value: key, order: order });
      }
    });

    var arr = Array.from(map.values()).sort(function (a, b) {
      var n1 = parseInt(a.value, 10);
      var n2 = parseInt(b.value, 10);
      var bothNumeric = !isNaN(n1) && !isNaN(n2);
      if (bothNumeric && n1 !== n2) return n1 - n2;

      var diff = a.order - b.order;
      if (diff !== 0) return diff;

      return String(a.value).localeCompare(String(b.value));
    });

    return arr.map(function (x) {
      return x.value;
    });
  }

  // Lista de capítulos/sections (level_5) para el libro actual
  async function loadVersesList(ctx) {
    var allRows = [];
    try {
      if (window.EntriesMemory && typeof window.EntriesMemory.getRows === "function") {
        allRows = window.EntriesMemory.getRows() || [];
      }
    } catch (e) {
      console.warn("[Navigator] EntriesMemory.getRows error (verses)", e);
    }
    if (!allRows.length) return [];

    var map = new Map();

    allRows.forEach(function (row) {
      if (row.language_code !== ctx.language_code) return;
      if (row.level_1 !== ctx.level_1) return;
      if (row.level_2 !== ctx.level_2) return;
      if (row.level_3 !== ctx.level_3) return;
      if (row.level_4 !== ctx.level_4) return;

      var l5 = row.level_5;
      if (!l5) return;
      var key = String(l5);
      var order =
        typeof row.entry_order === "number"
          ? row.entry_order
          : Number.MAX_SAFE_INTEGER;

      var existing = map.get(key);
      if (!existing || order < existing.order) {
        map.set(key, { value: key, order: order });
      }
    });

    var arr = Array.from(map.values()).sort(function (a, b) {
      var n1 = parseInt(a.value, 10);
      var n2 = parseInt(b.value, 10);
      var bothNumeric = !isNaN(n1) && !isNaN(n2);
      if (bothNumeric && n1 !== n2) return n1 - n2;

      var diff = a.order - b.order;
      if (diff !== 0) return diff;

      return String(a.value).localeCompare(String(b.value));
    });

    return arr.map(function (x) {
      return x.value;
    });
  }

  // ======================
  // Navegación por flechas
  // ======================

  function createArrowButton(className, iconName, disabled, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    var cls = "nav-arrow " + className;
    if (disabled) cls += " nav-arrow-disabled";
    btn.className = cls;

    var icon = document.createElement("i");
    icon.setAttribute("data-lucide", iconName);
    btn.appendChild(icon);

    if (!disabled && typeof onClick === "function") {
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        onClick();
      });
    }

    return btn;
  }

  function navigateChapter(newLevel4, ctx) {
    if (!newLevel4) return;
    window.ToolbarState = window.ToolbarState || {};
    window.ToolbarState.level_3 = ctx.level_3;
    window.ToolbarState.level_4 = newLevel4;
    window.ToolbarState.level_5 = "";

    if (window.Toolbar && typeof window.Toolbar.refreshBreadcrumb === "function") {
      window.Toolbar.refreshBreadcrumb();
    } else if (window.Main && typeof window.Main.showView === "function") {
      window.Main.showView("navigator");
    }
  }

function navigateSection(newLevel5, ctx) {
  if (!newLevel5) return;

  // Actualizamos el state, pero sin volver a recargar level_3 / level_4 desde la BD
  window.ToolbarState = window.ToolbarState || {};
  window.ToolbarState.level_3 = ctx.level_3;
  window.ToolbarState.level_4 = ctx.level_4;
  window.ToolbarState.level_5 = newLevel5;

  // Sin llamar a refreshBreadcrumb: no queremos que vuelva a consultar level_3/4
  // Solo sincronizamos el select de level_5 si existe
  try {
    var selL5 = document.getElementById("crumb-l5");
    if (selL5) {
      selL5.value = newLevel5;
    }
  } catch (e) {
    console.warn("[Navigator] no se pudo actualizar crumb-l5", e);
  }

  // Volvemos a renderizar solo la vista Navigator para el nuevo level_5
  if (window.Main && typeof window.Main.showView === "function") {
    window.Main.showView("navigator");
  }
}

  // ======================
  // Render principal
  // ======================


  // ======================
  // Loader en el panel principal (Navigator)
  // ======================
  function showMainLoader(container) {
    if (!container) return;
    var cs = null;
    try {
      cs = window.getComputedStyle(container);
    } catch (e) {}
    if (!cs || !cs.position || cs.position === "static") {
      container.style.position = "relative";
    }

    var overlay = container.querySelector(".main-loading-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "main-loading-overlay";
      var label = document.createElement("div");
      label.className = "main-loading-text";
      overlay.appendChild(label);
      container.appendChild(overlay);
    }

    overlay.dataset.progress = "0";
    var labelEl = overlay.querySelector(".main-loading-text");
    var lang = getLang();
    if (labelEl) {
      // labelEl.textContent intentionally left blank (no visible text);
    }

    if (overlay._timer) {
      clearInterval(overlay._timer);
    }
    overlay._timer = setInterval(function () {
      var p = parseInt(overlay.dataset.progress || "0", 10);
      if (isNaN(p)) p = 0;
      if (p >= 90) return;
      p += 2;
      overlay.dataset.progress = String(p);
      if (labelEl) {
        // labelEl.textContent intentionally left blank (no visible text);
      }
    }, 80);
  }

  function hideMainLoader(container) {
    if (!container) return;
    var overlay = container.querySelector(".main-loading-overlay");
    if (!overlay) return;

    var labelEl = overlay.querySelector(".main-loading-text");
    var lang = getLang();
    overlay.dataset.progress = "100";
    if (labelEl) {
      // labelEl.textContent intentionally left blank on hide;
    }

    if (overlay._timer) {
      clearInterval(overlay._timer);
      overlay._timer = null;
    }

    setTimeout(function () {
      if (overlay && overlay.parentNode === container) {
        container.removeChild(overlay);
      }
    }, 400);
  }

function renderNav(container) {
    if (!container) return;

    var body = container;
    body.innerHTML = "";

    
    (async function () {

var prefs = getPrefs();
    var lang = getLang();
    var toolbarState = window.ToolbarState || {};

    var level_3 = toolbarState.level_3 || "";
    var level_4 = toolbarState.level_4 || "";
    var level_5 = toolbarState.level_5 || "";

    var collection = prefs.collection || null;
    var corpus = prefs.corpus || null;

    // Encabezado principal dentro del main (sin solapa invertida)
    var header = document.createElement("div");
    header.className = "main-view-header";

    var h1 = document.createElement("h1");
    h1.className = "main-view-title";

    var defaultTitle = lang === "en" ? "Navigation" : "Navegación";

    if (level_4 && level_5) {
      h1.textContent = level_4 + " " + level_5;
    } else {
      h1.textContent = defaultTitle;
    }

    header.appendChild(h1);
    body.appendChild(header);

    if (!collection || !corpus || !level_3 || !level_4 || !level_5) {
      // Mensaje de bienvenida mientras no haya contexto completo de navegación
      body.innerHTML = "";

      var wrap = document.createElement("div");
      wrap.className = "main-welcome";

      var line1 = document.createElement("div");
      line1.className = "main-welcome-line1";
      line1.textContent = lang === "en" ? "Welcome to" : "Bienvenido a";

      var line2 = document.createElement("div");
      line2.className = "main-welcome-line2";
      line2.textContent =
        lang === "en" ? "Study.GODiOS.org" : "Estudio.GODiOS.org";

      wrap.appendChild(line1);
      wrap.appendChild(line2);
      body.appendChild(wrap);
      return;
    }

    var ctxBase = {
      language_code: prefs.language || "es",
      level_1: collection,
      level_2: corpus,
      level_3: level_3,
      level_4: level_4,
      level_5: level_5,
    };

    // Cargar en paralelo: lista de versículos + listas para navegación
    showMainLoader(body);
    var itemsPromise = loadLevel6_7(ctxBase);

    var chaptersPromise = loadChaptersList(ctxBase);
    var versesPromise = loadVersesList(ctxBase);

    var items = await itemsPromise;
    var chapters = await chaptersPromise;
    var verses = await versesPromise;

    // Capa para flechas de navegación
    var arrowsLayer = document.createElement("div");
    arrowsLayer.className = "nav-arrows-layer";

    var idxChapter = chapters.indexOf(level_4);
    var prevChapter = idxChapter > 0 ? chapters[idxChapter - 1] : null;
    var nextChapter =
      idxChapter >= 0 && idxChapter < chapters.length - 1
        ? chapters[idxChapter + 1]
        : null;

    var idxVerse = verses.indexOf(level_5);
    var prevVerse = idxVerse > 0 ? verses[idxVerse - 1] : null;
    var nextVerse =
      idxVerse >= 0 && idxVerse < verses.length - 1
        ? verses[idxVerse + 1]
        : null;

    var arrowsCtx = {
      level_3: level_3,
      level_4: level_4,
      level_5: level_5,
      language_code: ctxBase.language_code,
      level_1: collection,
      level_2: corpus,
    };

    var leftBtn = createArrowButton(
      "nav-arrow-left",
      "step-back",
      !prevVerse,
      function () {
        navigateSection(prevVerse, arrowsCtx);
      }
    );
    var rightBtn = createArrowButton(
      "nav-arrow-right",
      "step-forward",
      !nextVerse,
      function () {
        navigateSection(nextVerse, arrowsCtx);
      }
    );

    if (header) {
      header.appendChild(leftBtn);
      header.appendChild(rightBtn);
      try {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
          window.lucide.createIcons();
        }
      } catch (eLucide) {}
    }

    // Sin versículos => mensaje
    if (!items.length) {
      // No mostramos mensajes de "sin entradas" aquí para evitar flash al cambiar preferencias.
      return;
    }

    // Lista de versículos
    var list = document.createElement("div");
    list.className = "nav-items-list";

    items.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "nav-item-row";
      row.dataset.level6 = item.level_6 || "";
      row.dataset.level7 = item.level_7 || "";

      var numSpan = document.createElement("span");
      numSpan.className = "nav-item-num";
      numSpan.textContent = item.level_6 || "";

      var textSpan = document.createElement("span");
      textSpan.className = "nav-item-text";
      textSpan.textContent = item.level_7 || "";

      row.appendChild(numSpan);
      row.appendChild(textSpan);

      row.addEventListener("click", function () {
        if (!window.Main || typeof window.Main.showView !== "function") return;

        window.Main.showView("focus", {
          level_1: collection,
          level_2: corpus,
          level_3: level_3,
          level_4: level_4,
          level_5: level_5,
          level_6: item.level_6 || "",
          level_7: item.level_7 || "",
        });
      });

      list.appendChild(row);
    });

    body.appendChild(list);
    hideMainLoader(body);

    })();
  }



  return {
    renderNav: renderNav,
  };
})();