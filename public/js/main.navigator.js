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
    var client = getSupabaseClient();
    if (!client) return [];

    var map = new Map();
    var chunkSize = 1000;
    var from = 0;
    var done = false;

    while (!done) {
      var to = from + chunkSize - 1;
      var q = client
        .from("entries")
        .select("level_6, level_7, entry_order")
        .eq("language_code", filters.language_code)
        .eq("level_1", filters.level_1)
        .eq("level_2", filters.level_2)
        .eq("level_3", filters.level_3)
        .eq("level_4", filters.level_4)
        .eq("level_5", filters.level_5)
        .range(from, to);

      try {
        var resp = await q;
        if (resp.error) {
          console.warn("[Navigator] entries level_6/7 error", resp.error);
          break;
        }

        var rows = resp.data || [];
        rows.forEach(function (row) {
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

        if (rows.length < chunkSize) {
          done = true;
        } else {
          from += chunkSize;
        }
      } catch (e) {
        console.warn("[Navigator] error cargando level_6/7", e);
        break;
      }
    }

    var items = Array.from(map.values()).sort(function (a, b) {
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
    var client = getSupabaseClient();
    if (!client) return [];

    var map = new Map();
    var chunkSize = 1000;
    var from = 0;
    var done = false;

    while (!done) {
      var to = from + chunkSize - 1;
      var q = client
        .from("entries")
        .select("level_4, entry_order")
        .eq("language_code", ctx.language_code)
        .eq("level_1", ctx.level_1)
        .eq("level_2", ctx.level_2)
        .eq("level_3", ctx.level_3)
        .not("level_4", "is", null)
        .range(from, to);

      try {
        var resp = await q;
        if (resp.error) {
          console.warn("[Navigator] loadChaptersList error", resp.error);
          break;
        }

        var rows = resp.data || [];
        rows.forEach(function (row) {
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

        if (rows.length < chunkSize) {
          done = true;
        } else {
          from += chunkSize;
        }
      } catch (e) {
        console.warn("[Navigator] error cargando capítulos (level_4)", e);
        break;
      }
    }

    var arr = Array.from(map.values()).sort(function (a, b) {
      var diff = a.order - b.order;
      if (diff !== 0) return diff;
      return a.value.localeCompare(b.value);
    });

    return arr.map(function (x) {
      return x.value;
    });
  }

  // Lista de capítulos/sections (level_5) para el libro actual
  async function loadVersesList(ctx) {
    var client = getSupabaseClient();
    if (!client) return [];

    var map = new Map();
    var chunkSize = 1000;
    var from = 0;
    var done = false;

    while (!done) {
      var to = from + chunkSize - 1;
      var q = client
        .from("entries")
        .select("level_5, entry_order")
        .eq("language_code", ctx.language_code)
        .eq("level_1", ctx.level_1)
        .eq("level_2", ctx.level_2)
        .eq("level_3", ctx.level_3)
        .eq("level_4", ctx.level_4)
        .not("level_5", "is", null)
        .range(from, to);

      try {
        var resp = await q;
        if (resp.error) {
          console.warn("[Navigator] loadVersesList error", resp.error);
          break;
        }

        var rows = resp.data || [];
        rows.forEach(function (row) {
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

        if (rows.length < chunkSize) {
          done = true;
        } else {
          from += chunkSize;
        }
      } catch (e) {
        console.warn("[Navigator] error cargando level_5", e);
        break;
      }
    }

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

  function createArrowButton(className, label, disabled, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "nav-arrow " + className + (disabled ? " nav-arrow-disabled" : "");
    btn.innerHTML = "<span>" + label + "</span>";

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

  async function renderNav(container) {
    if (!container) return;

    var body = container;
    body.innerHTML = "";

    var prefs = getPrefs();
    var lang = getLang();
    var toolbarState = window.ToolbarState || {};

    var level_3 = toolbarState.level_3 || "";
    var level_4 = toolbarState.level_4 || "";
    var level_5 = toolbarState.level_5 || "";

    var collection = prefs.collection || null;
    var corpus = prefs.corpus || null;

    // Solapa (#view-title) = "Mateo 17"
    var viewTitle = document.getElementById("view-title");
    var defaultTitle = lang === "en" ? "Navigation" : "Navegación";

    if (viewTitle) {
      if (level_4 && level_5) {
        viewTitle.textContent = level_4 + " " + level_5;
      } else {
        viewTitle.textContent = defaultTitle;
      }
      viewTitle.style.display = "inline-block";
    }

    if (!collection || !corpus || !level_3 || !level_4 || !level_5) {
      var p = document.createElement("p");
      p.textContent =
        lang === "en"
          ? "Use the breadcrumb to select Collection, Corpus and levels."
          : "Usa el breadcrumb para seleccionar Colección, Corpus y niveles.";
      body.appendChild(p);
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
      "◀",
      !prevVerse,
      function () {
        navigateSection(prevVerse, arrowsCtx);
      }
    );
    var rightBtn = createArrowButton(
      "nav-arrow-right",
      "▶",
      !nextVerse,
      function () {
        navigateSection(nextVerse, arrowsCtx);
      }
    );

    arrowsLayer.appendChild(leftBtn);
    arrowsLayer.appendChild(rightBtn);

    body.appendChild(arrowsLayer);

    // Sin versículos => mensaje
    if (!items.length) {
      var pEmpty = document.createElement("p");
      pEmpty.textContent =
        lang === "en"
          ? "No entries found for this combination."
          : "No hay entradas para esta combinación.";
      body.appendChild(pEmpty);
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
  }

  return {
    renderNav: renderNav,
  };
})();
