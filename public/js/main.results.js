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
      lang === "en" ? "Results" : "Resultados";

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

    // Clasificación: exactos, contemplados (solo diferencia de acentos) y aproximados
    var qRaw = String(query || "");
    var qLower = qRaw.toLowerCase();
    var qNorm = normalizeNoAccents(qRaw);

    var exactCount = 0;
    var contempladoCount = 0;

    
    
    
    var decorated = (items || []).map(function (row) {
      var verseText = row.level_7 || "";
      var tLower = verseText.toLowerCase();
      var tNorm = normalizeNoAccents(verseText);

      var hasExact = qLower && tLower.indexOf(qLower) !== -1;
      var hasContemplado = !hasExact && qNorm && tNorm.indexOf(qNorm) !== -1;

      if (hasExact) {
        exactCount++;
      } else if (hasContemplado) {
        contempladoCount++;
      }

      // ÚNICO: la palabra buscada aparece como palabra aislada (no parte de otra)
      var isUnique = false;
      if (qNorm) {
        var tokens = tNorm.split(/[^a-z0-9ñ]+/i).filter(function (tok) { return !!tok; });
        isUnique = tokens.some(function (tok) {
          return tok === qNorm;
        });
      }

      var html = highlightHTML(verseText, query);

      return {
        row: row,
        html: html,
        isExact: !!hasExact,
        isContemplado: !!hasContemplado,
        isUnique: !!isUnique
      };
    });

    items = decorated;

    var totalCount  = (items && items.length) || 0;
    var approxCount = totalCount - exactCount - contempladoCount;
    var uniqueCount = (items || []).filter(function (it) { return it.isUnique; }).length;

// Título general
    if (lang === "en") {
      h1.textContent = "Results";
    } else {
      h1.textContent = "Resultados";
    }

    // Resumen de conteos antes de la lista
    var summary = document.createElement("div");
    summary.className = "results-summary panel-single";

    var chipsRow = document.createElement("div");
    chipsRow.className = "results-summary-chips";

    var filterState = {
      exact: true,
      contemplado: true,
      approx: true,
      unique: true,
    };

    function addSummaryChip(key, iconName, count, label) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "results-summary-chip is-active";
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
        // alternar estado del filtro; evitar que todos queden apagados
        var current = !!filterState[key];
        filterState[key] = !current;

        if (!filterState.exact && !filterState.contemplado && !filterState.approx && !filterState.unique) {
          // no permitir que los tres queden en OFF
          filterState[key] = true;
          return;
        }

        chip.classList.toggle("is-active", filterState[key]);
        chip.classList.toggle("is-inactive", !filterState[key]);

        if (typeof renderList === "function") {
          renderList();
        }
      });

      chipsRow.appendChild(chip);
    }

    var lblExact = lang === "en" ? "exact" : "exactos";
    var lblCont = lang === "en" ? "covered" : "contemplados";
    var lblApprox = lang === "en" ? "approx." : "aproximado";
    var lblUnique = lang === "en" ? "unique" : "únicos";

    addSummaryChip("unique", "check-circle", uniqueCount, lblUnique);
    addSummaryChip("exact", "target", exactCount, lblExact);
    addSummaryChip("contemplado", "crosshair", contempladoCount, lblCont);
    addSummaryChip("approx", "circle-dashed", approxCount, lblApprox);

    function entryPassesFilters(entry) {
      if (entry.isExact && !filterState.exact) return false;
      if (entry.isContemplado && !filterState.contemplado) return false;
      if (!entry.isExact && !entry.isContemplado && !filterState.approx) return false;
      if (entry.isUnique && !filterState.unique) return false;
      return true;
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
        item.className = "results-item";
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