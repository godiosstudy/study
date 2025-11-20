// main.results.js – resultados de búsqueda en entries
window.MainResults = (function () {
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
      console.warn("[Results] error obteniendo cliente Supabase", e);
    }
    return null;
  }

  // ===== utilidades para resaltar =====
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      switch (ch) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return ch;
      }
    });
  }

  function highlightHTML(text, query) {
    if (!query) return escapeHtml(text);

    var q = String(query || "").toLowerCase();
    var t = String(text || "");
    var tl = t.toLowerCase();

    var idx = 0;
    var result = "";

    while (true) {
      var found = tl.indexOf(q, idx);
      if (found === -1) {
        result += escapeHtml(t.slice(idx));
        break;
      }
      result += escapeHtml(t.slice(idx, found));
      var match = t.slice(found, found + q.length);
      result += "<mark>" + escapeHtml(match) + "</mark>";
      idx = found + q.length;
    }

    return result;
  }

  function normalizeStr(str) {
    if (!str) return "";
    var s = String(str).toLowerCase();
    try {
      s = s.normalize("NFD").replace(/\p{Diacritic}+/gu, "");
    } catch (e) {
      s = s
        .replace(/[ÁÄÂÀáäâà]/g, "a")
        .replace(/[ÉËÊÈéëêè]/g, "e")
        .replace(/[ÍÏÎÌíïîì]/g, "i")
        .replace(/[ÓÖÔÒóöôò]/g, "o")
        .replace(/[ÚÜÛÙúüûù]/g, "u")
        .replace(/ñ/g, "n");
    }
    return s.replace(/\s+/g, " ").trim();
  }

  // ===== mapa dinámico de libros por idioma (sin atajos hardcodeados) =====
  var bookMapByLang = {};
  var bookPromiseByLang = {};

  async function ensureBookMap(lang) {
    lang = lang || getLang();
    if (bookMapByLang[lang]) return;

    if (bookPromiseByLang[lang]) {
      await bookPromiseByLang[lang];
      return;
    }

    var client = getSupabaseClient();
    var map = {};

    if (!client) {
      bookMapByLang[lang] = map;
      return;
    }

    var p = client
      .from("entries")
      .select("level_4", { distinct: true })
      .eq("language_code", lang)
      .not("level_4", "is", null)
      .order("level_4", { ascending: true });

    bookPromiseByLang[lang] = p;

    try {
      var resp = await p;
      if (!resp.error && Array.isArray(resp.data)) {
        resp.data.forEach(function (row) {
          var name = row && row.level_4;
          if (!name) return;
          var norm = normalizeStr(name);
          if (norm && !map[norm]) {
            map[norm] = name;
          }
        });
      } else if (resp && resp.error) {
        console.warn("[Results] ensureBookMap error", resp.error);
      }
    } catch (e) {
      console.warn("[Results] ensureBookMap exception", e);
    }

    bookMapByLang[lang] = map;
    bookPromiseByLang[lang] = null;
  }

  async function resolveBookFromQuery(bookPart, lang) {
    var n = normalizeStr(bookPart);
    if (!n) return null;
    lang = lang || getLang();

    await ensureBookMap(lang);
    var map = bookMapByLang[lang] || {};
    return map[n] || null;
  }

  function sortEntriesList(rows) {
    rows.sort(function (a, b) {
      var o1 =
        typeof a.entry_order === "number"
          ? a.entry_order
          : Number.MAX_SAFE_INTEGER;
      var o2 =
        typeof b.entry_order === "number"
          ? b.entry_order
          : Number.MAX_SAFE_INTEGER;
      if (o1 !== o2) return o1 - o2;

      var b1 = String(a.level_4 || "");
      var b2 = String(b.level_4 || "");
      var cmpB = b1.localeCompare(b2);
      if (cmpB !== 0) return cmpB;

      var c1 = parseInt(a.level_5, 10);
      var c2 = parseInt(b.level_5, 10);
      if (!isNaN(c1) && !isNaN(c2) && c1 !== c2) return c1 - c2;

      var v1 = parseInt(a.level_6, 10);
      var v2 = parseInt(b.level_6, 10);
      if (!isNaN(v1) && !isNaN(v2) && v1 !== v2) return v1 - v2;

      return String(a.level_7 || "").localeCompare(String(b.level_7 || ""));
    });

    return rows;
  }

  // ===== búsqueda en memoria con Fuse.js (EntriesMemory) =====
  async function searchEntries(query, prefs) {
    var raw = String(query || "").trim();
    if (!raw) return [];

    if (!window.EntriesMemory || typeof window.EntriesMemory.search !== "function") {
      console.warn("[Results] EntriesMemory.search no disponible");
      return [];
    }

    var items = window.EntriesMemory.search(raw) || [];
    return items.slice();
  }

  // ===== render principal =====
  async function render(container, options) {
    if (!container) return;

    var body = container;
    body.innerHTML = "";

    var prefs = getPrefs();
    var lang = getLang();
    var query = (options && options.query) || "";

    // Encabezado (título dentro del main)
    var header = document.createElement("div");
    header.className = "main-view-header";

    var h1 = document.createElement("h1");
    h1.className = "main-view-title";
    h1.textContent =
      lang === "en" ? "Search results" : "Resultados de búsqueda";

    header.appendChild(h1);
    body.appendChild(header);

    // Contenedor para resultados (usamos el layout tipo Navigator)
    var list = document.createElement("div");
    list.className = "nav-items-list panel-single";
    body.appendChild(list);

    if (!query) {
      var pEmpty = document.createElement("p");
      pEmpty.textContent =
        lang === "en"
          ? "Type something in the search box."
          : "Escribe algo en la caja de búsqueda.";
      body.appendChild(pEmpty);
      return;
    }

    // Mensaje mientras carga (lo quitamos luego)
    var info = document.createElement("p");
    info.textContent =
      lang === "en"
        ? 'Searching for "' + query + '"...'
        : 'Buscando "' + query + '"...';
    body.appendChild(info);

    // Buscar en memoria vía EntriesMemory/Fuse
    var items = await searchEntries(query, prefs);

    // Quitamos el texto informativo
    info.remove();

    // Calcular exactos (texto que realmente contiene la palabra buscada)
    var exactCount = 0;
    var decorated = (items || []).map(function (row) {
      var verseText = row.level_7 || "";
      var html = highlightHTML(verseText, query);
      var isExact = html.indexOf("<mark>") !== -1;
      if (isExact) exactCount++;
      return {
        row: row,
        html: html,
        isExact: isExact
      };
    });

    items = decorated;

    // Actualizar título con cantidad de resultados
    var count = (items && items.length) || 0;
    if (lang === "en") {
      h1.textContent =
        "Search results: " + exactCount + " exact of " + count + " approx";
    } else {
      h1.textContent =
        "Resultados de búsqueda: " +
        exactCount +
        " exactos de " +
        count +
        " aproximados";
    }

    if (!items.length) {
      var none = document.createElement("p");
      none.textContent =
        lang === "en"
          ? "No entries found."
          : "No se encontraron entradas.";
      list.appendChild(none);
      return;
    }

    // Render de la lista (similar a Navigator)
    items.forEach(function (entry) {
      var row = entry.row;
      var book = row.level_4 || "";
      var chapter = row.level_5 || "";
      var verse = row.level_6 || "";
      var text = row.level_7 || "";

      var item = document.createElement("div");
      item.className = "nav-item-row";
      item.dataset.level4 = book;
      item.dataset.level5 = chapter;
      item.dataset.level6 = verse;

      var numSpan = document.createElement("span");
      numSpan.className = "nav-item-num";

      var refText = "";
      if (book) refText += book;
      if (chapter) refText += (refText ? " " : "") + chapter;
      if (verse) refText += ":" + verse;
      numSpan.textContent = refText || verse || "";

      var textSpan = document.createElement("span");
      textSpan.className = "nav-item-text";
      textSpan.innerHTML = entry.html;

      item.appendChild(numSpan);
      item.appendChild(textSpan);

      item.addEventListener("click", function () {
        if (!window.Main || typeof window.Main.showView !== "function") return;

        var navParams = {
          level_1: prefs.collection || row.level_1 || null,
          level_2: prefs.corpus || row.level_2 || null,
          level_3: row.level_3 || null,
          level_4: book || null,
          level_5: chapter || null,
          level_6: verse || null,
          level_7: text || null
        };

        window.Main.showView("focus", navParams);
      });

      list.appendChild(item);
    });

  }

  return {
    render: render
  };
})();
