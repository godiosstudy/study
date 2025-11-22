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

  function normalizeNoAccents(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
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

  function classifyUniqueSimilarIncluded(text, query) {
    var t = String(text || "");
    var q = String(query || "");
    if (!q) {
      return {
        html: escapeHtml(t),
        hasUnique: false,
        hasSimilar: false,
        hasIncluded: false
      };
    }

    var qNorm = normalizeNoAccents(q);
    var hasUnique = false;
    var hasSimilar = false;
    var hasIncluded = false;
    var result = "";
    var lastIndex = 0;

    // Palabras = secuencias de letras/números (incluyendo acentos y ñ)
    var wordRe = /[A-Za-zÁÉÍÓÚÜáéíóúÑñ0-9]+/g;
    var match;
    while ((match = wordRe.exec(t)) !== null) {
      var word = match[0];
      var start = match.index;
      var end = start + word.length;

      // texto entre palabras
      if (lastIndex < start) {
        result += escapeHtml(t.slice(lastIndex, start));
      }

      var wordNorm = normalizeNoAccents(word);

      if (word === q) {
        // ÚNICO: coincide exactamente, incluyendo mayúsculas/minúsculas y acentos
        hasUnique = true;
        result += '<mark class="mark-unique">' + escapeHtml(word) + '</mark>';
      } else if (wordNorm === qNorm) {
        // SIMILAR: misma palabra al normalizar, pero con alguna variación
        hasSimilar = true;
        result += '<mark class="mark-similar">' + escapeHtml(word) + '</mark>';
      } else if (qNorm && wordNorm.indexOf(qNorm) !== -1) {
        // INCLUIDA: contiene la base normalizada en cualquier posición (inicio, medio, fin)
        hasIncluded = true;
        result += '<mark class="mark-included">' + escapeHtml(word) + '</mark>';
      } else {
        // no coincide: se deja tal cual
        result += escapeHtml(word);
      }

      lastIndex = end;
    }

    // resto del texto después de la última palabra
    if (lastIndex < t.length) {
      result += escapeHtml(t.slice(lastIndex));
    }

    return {
      html: result,
      hasUnique: hasUnique,
      hasSimilar: hasSimilar,
      hasIncluded: hasIncluded
    };
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
    list.className = "nav-items-list results-list";
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

    // Clasificación: Únicos, Similares, Incluidas y Cercanías
    var qRaw = String(query || "");

    var decorated = (items || []).map(function (row) {
      var verseText = row.level_7 || "";
      var info = classifyUniqueSimilarIncluded(verseText, qRaw);

      var isU = !!info.hasUnique;
      var isS = !!info.hasSimilar;
      var isI = !!info.hasIncluded;
      var isN = !isU && !isS && !isI;

      return {
        row: row,
        html: info.html,
        isUnique: isU,
        isSimilar: isS,
        isIncluded: isI,
        isNear: isN
      };
    });

    items = decorated;

    var totalCount   = (items && items.length) || 0;
    var uniqueCount  = 0;
    var similarCount = 0;
    var includedCount = 0;
    var nearCount    = 0;

    items.forEach(function (it) {
      if (it.isUnique)   uniqueCount++;
      if (it.isSimilar)  similarCount++;
      if (it.isIncluded) includedCount++;
      if (it.isNear)     nearCount++;
    });

    // Título general
    if (lang === "en") {
      h1.textContent = "Search results";
    } else {
      h1.textContent = "Resultados";
    }

    // Resumen de conteos antes de la lista
    var summary = document.createElement("div");
    summary.className = "results-summary panel-single";

    var chipsRow = document.createElement("div");
    chipsRow.className = "results-summary-chips";

    var filterState = {
      unique: true,
      similar: true,
      included: true,
      near: true
    };

    function addSummaryChip(key, iconName, count, label) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "results-summary-chip is-active";
      chip.classList.add("results-summary-chip--" + key);
      chip.dataset.filterKey = key;

      var spanCount = document.createElement("div");
      spanCount.className = "results-summary-count";
      spanCount.textContent = String(count);
      chip.appendChild(spanCount);

      var iconWrap = document.createElement("div");
      iconWrap.className = "results-summary-icon";
      var iconEl = document.createElement("i");
      iconEl.setAttribute("data-lucide", iconName);
      iconWrap.appendChild(iconEl);
      chip.appendChild(iconWrap);

      var spanLabel = document.createElement("div");
      spanLabel.className = "results-summary-label";
      spanLabel.textContent = label;
      chip.appendChild(spanLabel);

      chip.addEventListener("click", function () {
        var key = chip.dataset.filterKey;
        if (!key) return;

        var isActive = !!filterState[key];
        filterState[key] = !isActive;

        chip.classList.toggle("is-active", filterState[key]);
        chip.classList.toggle("is-inactive", !filterState[key]);

        if (typeof renderList === "function") {
          renderList();
        }
      });

      chipsRow.appendChild(chip);
    }

    var lblUnique   = lang === "en" ? "Unique"    : "Únicos";
    var lblSimilar  = lang === "en" ? "Similar"   : "Similares";
    var lblIncluded = lang === "en" ? "Included"  : "Incluidas";
    var lblNear     = lang === "en" ? "Nearby"    : "Cercanías";

    addSummaryChip("unique",   "check-circle", uniqueCount,   lblUnique);
    addSummaryChip("similar",  "sparkles",     similarCount,  lblSimilar);
    addSummaryChip("included", "link-2",       includedCount, lblIncluded);
    addSummaryChip("near",     "radar",        nearCount,     lblNear);

    function entryPassesFilters(entry) {
      if (entry.isUnique   && !filterState.unique)   return false;
      if (entry.isSimilar  && !filterState.similar)  return false;
      if (entry.isIncluded && !filterState.included) return false;
      if (entry.isNear     && !filterState.near)     return false;

      return (
        (entry.isUnique   && filterState.unique) ||
        (entry.isSimilar  && filterState.similar) ||
        (entry.isIncluded && filterState.included) ||
        (entry.isNear     && filterState.near)
      );
    }

    function renderList() {
      list.innerHTML = "";

      var filtered = (items || []).filter(entryPassesFilters);

      if (!filtered.length) {
        var none = document.createElement("p");
        none.textContent =
          lang === "en"
            ? "No entries found for the selected filters."
            : "No hay resultados para los filtros seleccionados.";
        list.appendChild(none);
        return;
      }

      filtered.forEach(function (entry, idx) {
        var row = entry.row;
        var book = row.level_4 || "";
        var chapter = row.level_5 || "";
        var verse = row.level_6 || "";
        var text = row.level_7 || "";

        var item = document.createElement("div");
        var catClass = entry.isUnique
          ? "unique"
          : (entry.isSimilar
              ? "similar"
              : (entry.isIncluded ? "included" : (entry.isNear ? "near" : "none")));
        item.className =
          "results-item" +
          (catClass && catClass !== "none" ? " results-item--" + catClass : "");
        item.dataset.level4 = book;
        item.dataset.level5 = chapter;
        item.dataset.level6 = verse;

        // Índice numérico a la izquierda
        var idxSpan = document.createElement("span");
        idxSpan.className = "results-index";
        idxSpan.textContent = String(idx + 1);

        // Contenedor vertical para referencia + texto
        var bodyBox = document.createElement("div");
        bodyBox.className = "results-item-body";
        // Índice numérico a la izquierda
        // Fila 1: referencia (Ej: Efesios 5:1), en bold y más pequeña
        var refDiv = document.createElement("div");
        refDiv.className = "results-ref";

        var refText = "";
        if (book) refText += book;
        if (chapter) refText += (refText ? " " : "") + chapter;
        if (verse) refText += ":" + verse;
        refDiv.textContent = refText || verse || "";

        // Fila 2: texto del versículo
        var textDiv = document.createElement("div");
        textDiv.className = "results-text";
        textDiv.innerHTML = entry.html;

        bodyBox.appendChild(refDiv);
        bodyBox.appendChild(textDiv);

        item.appendChild(idxSpan);
        item.appendChild(bodyBox);

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

    summary.appendChild(chipsRow);

    // Insertar el resumen antes de la lista de resultados
    body.insertBefore(summary, list);

    // Activar iconos Lucide en los chips
    try {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    } catch (eLucide) {}

    if (!items.length) {
      var none = document.createElement("p");
      none.textContent =
        lang === "en"
          ? "No entries found."
          : "No se encontraron entradas.";
      list.appendChild(none);
      return;
    }

    // Al inicio, con los tres filtros activos, renderizar la lista completa
    renderList();

  }

  return {
    render: render
  };
})();