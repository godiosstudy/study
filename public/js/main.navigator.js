// main.navigator.js – lista de level_6 / level_7 según breadcrumb
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

      if (bothNumeric && n1 !== n2) {
        return n1 - n2;
      }

      var diff = a.order - b.order;
      if (diff !== 0) return diff;

      return String(a.level_7 || "").localeCompare(String(b.level_7 || ""));
    });

    return items;
  }

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

    var filters = {
      language_code: prefs.language || "es",
      level_1: collection,
      level_2: corpus,
      level_3: level_3,
      level_4: level_4,
      level_5: level_5,
    };

    var items = await loadLevel6_7(filters);

    if (!items.length) {
      var pEmpty = document.createElement("p");
      pEmpty.textContent =
        lang === "en"
          ? "No entries found for this combination."
          : "No hay entradas para esta combinación.";
      body.appendChild(pEmpty);
      return;
    }

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
