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

    var q = query.toLowerCase();
    var t = String(text);
    var tl = t.toLowerCase();
    var result = "";
    var idx = 0;

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
        .replace(/[áàäâ]/g, "a")
        .replace(/[éèëê]/g, "e")
        .replace(/[íìïî]/g, "i")
        .replace(/[óòöô]/g, "o")
        .replace(/[úùüû]/g, "u")
        .replace(/ñ/g, "n");
    }
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  var BOOK_ALIASES = [
    { name: "Génesis", aliases: ["genesis", "gen"] },
    { name: "Éxodo", aliases: ["exodo", "exo"] },
    { name: "Levítico", aliases: ["levitico", "lev", "lv"] },
    { name: "Números", aliases: ["numeros", "num"] },
    { name: "Deuteronomio", aliases: ["deuteronomio", "deut", "dt"] },
    { name: "Josué", aliases: ["josue"] },
    { name: "Jueces", aliases: ["jueces", "jue"] },
    { name: "Rut", aliases: ["rut"] },
    { name: "1 Samuel", aliases: ["1samuel", "1 samuel", "1s"] },
    { name: "2 Samuel", aliases: ["2samuel", "2 samuel", "2s"] },
    { name: "1 Reyes", aliases: ["1reyes", "1 reyes", "1r"] },
    { name: "2 Reyes", aliases: ["2reyes", "2 reyes", "2r"] },
    { name: "Salmos", aliases: ["salmos", "salmo", "sal"] },
    { name: "Proverbios", aliases: ["proverbios", "prov", "pr"] },
    { name: "Eclesiastés", aliases: ["eclesiastes", "ecle", "ecl", "ecles", "eclesiast"] },
    { name: "Isaías", aliases: ["isaias", "isa"] },
    { name: "Jeremías", aliases: ["jeremias", "jer"] },
    { name: "Ezequiel", aliases: ["ezequiel", "ezeq", "eze"] },
    { name: "Mateo", aliases: ["mateo", "mt"] },
    { name: "Marcos", aliases: ["marcos", "marco", "mr"] },
    { name: "Lucas", aliases: ["lucas", "lc"] },
    { name: "Juan", aliases: ["juan", "jn"] },
    { name: "Hechos", aliases: ["hechos", "hch"] },
    { name: "Romanos", aliases: ["romanos", "rom"] }
  ];

  function resolveBookFromQuery(bookPart) {
    var n = normalizeStr(bookPart);
    if (!n) return null;

    for (var i = 0; i < BOOK_ALIASES.length; i++) {
      var entry = BOOK_ALIASES[i];
      var aliases = (entry.aliases || []).slice();
      aliases.push(normalizeStr(entry.name));

      for (var j = 0; j < aliases.length; j++) {
        var a = aliases[j];
        if (!a) continue;
        if (a === n) return entry.name;
        if (a.length >= 3 && n.length >= 3 && a.indexOf(n) === 0) {
          return entry.name;
        }
      }
    }
    return null;
  }

  // ===== búsqueda en Supabase =====

  async function searchEntries(query, prefs) {
    var client = getSupabaseClient();
    if (!client || !query) return [];

    var lang = (prefs && prefs.language) || "es";
    var raw = String(query || "").trim();
    if (!raw) return [];

    var norm = normalizeStr(raw);
    var hasDigit = /\d/.test(norm);

    var book = null;
    var chapter = null;
    var verse = null;

    // Intentar referencia tipo "Juan 3" o "Juan 3:16"
    var m = raw.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);
    if (m) {
      book = resolveBookFromQuery(m[1]);
      chapter = m[2];
      verse = m[3] || null;
    }

    function sortRows(rows) {
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

    // 1) Referencia libro + capítulo (+ versículo)
    if (book && chapter) {
      var qRef = client
        .from("entries")
        .select(
          "id, language_code, level_1, level_2, level_3, level_4, level_5, level_6, level_7, entry_order"
        )
        .eq("language_code", lang)
        .eq("level_4", book)
        .eq("level_5", chapter);

      if (verse) {
        qRef = qRef.eq("level_6", verse);
      }

      if (prefs.collection) qRef = qRef.eq("level_1", prefs.collection);
      if (prefs.corpus) qRef = qRef.eq("level_2", prefs.corpus);

      try {
        var respRef = await qRef;
        if (!respRef.error && respRef.data && respRef.data.length) {
          return sortRows(respRef.data.slice());
        }
      } catch (e) {
        console.warn("[Results] search ref exception", e);
      }
      // si no hay resultados como referencia, caemos a las otras búsquedas
    }

    // 2) Solo libro (sin números) → todos los versículos de ese libro
    if (!hasDigit) {
      var bookOnly = resolveBookFromQuery(raw);
      if (bookOnly) {
        var qBook = client
          .from("entries")
          .select(
            "id, language_code, level_1, level_2, level_3, level_4, level_5, level_6, level_7, entry_order"
          )
          .eq("language_code", lang)
          .eq("level_4", bookOnly);

        if (prefs.collection) qBook = qBook.eq("level_1", prefs.collection);
        if (prefs.corpus) qBook = qBook.eq("level_2", prefs.corpus);

        try {
          var respBook = await qBook;
          if (!respBook.error && respBook.data && respBook.data.length) {
            return sortRows(respBook.data.slice());
          }
        } catch (e) {
          console.warn("[Results] search book exception", e);
        }
        // si tampoco encuentra nada, seguimos con búsqueda textual
      }
    }

    // 3) Búsqueda textual normal sobre level_7
    var qText = client
      .from("entries")
      .select(
        "id, language_code, level_1, level_2, level_3, level_4, level_5, level_6, level_7, entry_order"
      )
      .eq("language_code", lang)
      .ilike("level_7", "%" + raw + "%")
      .limit(200);

    if (prefs.collection) qText = qText.eq("level_1", prefs.collection);
    if (prefs.corpus) qText = qText.eq("level_2", prefs.corpus);

    try {
      var resp = await qText;
      if (resp.error) {
        console.warn("[Results] search error", resp.error);
        return [];
      }
      var rows = resp.data || [];
      return sortRows(rows);
    } catch (e) {
      console.warn("[Results] search exception", e);
      return [];
    }
  }

  // ===== render principal =====
  async function render(container, options) {
    if (!container) return;

    var body = container;
    body.innerHTML = "";

    var prefs = getPrefs();
    var lang = getLang();
    var query = (options && options.query) || "";

    // Solapa de título: "Resultados de búsqueda"
    var viewTitle = document.getElementById("view-title");
    if (viewTitle) {
      viewTitle.textContent =
        lang === "en" ? "Search results" : "Resultados de búsqueda";
    }

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

    var list = document.createElement("div");
    list.className = "results-list";
    body.appendChild(list);

    // Buscar en Supabase
    var items = await searchEntries(query, prefs);

    // Quitamos el texto "Resultados para..."
    info.remove();

    if (!items.length) {
      var none = document.createElement("p");
      none.textContent =
        lang === "en"
          ? "No entries found."
          : "No se encontraron entradas.";
      list.appendChild(none);
      return;
    }

    // Cada item: una línea, referencia chica & en bold + texto con highlight
    items.forEach(function (row) {
      var item = document.createElement("div");
      // Reutilizamos estilos de Navigator para hover (20% color sitio)
      item.className = "results-item nav-item-row";

      var ref =
        (row.level_4 || "?") +
        " " +
        (row.level_5 || "") +
        ":" +
        (row.level_6 || "");

      var refSpan = document.createElement("span");
      refSpan.className = "results-ref";
      refSpan.textContent = ref;

      var textSpan = document.createElement("span");
      textSpan.className = "results-text";
      textSpan.innerHTML = highlightHTML(row.level_7 || "", query);

      item.appendChild(refSpan);
      item.appendChild(textSpan);

      item.addEventListener("click", function () {
        if (!window.Main || typeof window.Main.showView !== "function") return;

        window.Main.showView("focus", {
          level_1: row.level_1 || null,
          level_2: row.level_2 || null,
          level_3: row.level_3 || null,
          level_4: row.level_4 || null,
          level_5: row.level_5 || null,
          level_6: row.level_6 || null,
          level_7: row.level_7 || null,
        });
      });

      list.appendChild(item);
    });
  }

  return {
    render: render,
  };
})();
