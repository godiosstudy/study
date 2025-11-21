// toolbar.js – búsqueda principal, breadcrumb y acciones del toolbar
window.Toolbar = (function () {
  function documentReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

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
      console.warn("[Toolbar] error obteniendo cliente Supabase", e);
    }
    return null;
  }

  // =========================
  // Search con placeholder i18n + búsqueda en tiempo real
  // =========================
  function initSearch() {
    var input = document.getElementById("tbar-search");
    if (!input) return;

    var lang = getLang();
    input.placeholder = lang === "en" ? "Search" : "Buscar";

    var debounceTimer = null;

    function triggerSearch() {
      var query = input.value.trim();

      // Vacío → volvemos a Navigator
      if (!query) {
        if (window.Main && typeof window.Main.showView === "function") {
          window.Main.showView("navigator");
        }
        return;
      }

      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("results", { query: query });
      }
    }

    // Tiempo real con debounce
    input.addEventListener("input", function () {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(triggerSearch, 300);
    });

    // Enter = buscar inmediato
    input.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter") return;
      if (debounceTimer) clearTimeout(debounceTimer);
      triggerSearch();
    });
  }

  // =========================
  // Siempre que el breadcrumb cambia → vamos a Navigator
  // =========================
  function maybeRefreshNavigator() {
    try {
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("navigator");
      }
    } catch (e) {
      console.warn("[Toolbar] error al mostrar navigator", e);
    }
  }

  // =========================
  // Breadcrumb: Collection > Corpus > level_3 > level_4 > level_5
  // =========================

  // loading visual en selects l3/l4/l5
  function makeSelectLoadingHelper(selL3, selL4, selL5) {
    return function setSelectLoadingUI(kind, active, percent) {
      var selectEl =
        kind === "l3" ? selL3 : kind === "l4" ? selL4 : kind === "l5" ? selL5 : null;
      if (!selectEl) return;

      if (!active) {
        selectEl.disabled = false;
        selectEl.classList.remove("crumb-select-loading");
        selectEl.style.backgroundImage = "";
        selectEl.style.color = "";
        return;
      }

      selectEl.disabled = true;
      selectEl.classList.add("crumb-select-loading");

      var p =
        typeof percent === "number" && percent >= 0
          ? Math.min(100, Math.round(percent))
          : 0;

      // SOLO porcentaje visible
      selectEl.innerHTML = "";
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = p + "%";
      selectEl.appendChild(opt);

      // barra de color del sistema
      selectEl.style.backgroundImage =
        "linear-gradient(to right, var(--accent, #154a8e) " +
        p +
        "%, rgba(0,0,0,0.06) " +
        p +
        "%)";

      // texto invertido según avance
      if (p < 50) {
        selectEl.style.color = "#154a8e";
      } else {
        selectEl.style.color = "#ffffff";
      }
    };
  }

  // Utilidad: cargar valores distintos para un nivel dado, en tandas de 1000,
  // ordenados por entry_order asc (y luego por texto / numérico)
  async function loadDistinctLevel(levelField, filters, loadingKind, setSelectLoadingUI) {
    var allRows = [];
    try {
      if (window.EntriesMemory && typeof window.EntriesMemory.getRows === "function") {
        allRows = window.EntriesMemory.getRows() || [];
      }
    } catch (e) {
      console.warn("[Toolbar] EntriesMemory.getRows error", e);
    }

    if (setSelectLoadingUI) setSelectLoadingUI(loadingKind, true, 0);

    if (!allRows.length) {
      if (setSelectLoadingUI) setSelectLoadingUI(loadingKind, false, 100);
      return [];
    }

    var map = new Map(); // valor -> menor entry_order

    allRows.forEach(function (row) {
      if (filters.language_code && row.language_code !== filters.language_code) return;
      if (filters.level_1 && row.level_1 !== filters.level_1) return;
      if (filters.level_2 && row.level_2 !== filters.level_2) return;

      if (filters.level_3 && levelField !== "level_3" && row.level_3 !== filters.level_3) return;
      if (filters.level_4 && levelField === "level_5" && row.level_4 !== filters.level_4) return;

      var v = row[levelField];
      if (!v) return;

      var order =
        typeof row.entry_order === "number"
          ? row.entry_order
          : Number.MAX_SAFE_INTEGER;

      if (!map.has(v) || order < map.get(v)) {
        map.set(v, order);
      }
    });

    var arr = Array.from(map.entries()).sort(function (a, b) {
      var orderA = a[1];
      var orderB = b[1];
      if (typeof orderA === "number" && typeof orderB === "number" && orderA !== orderB) {
        return orderA - orderB;
      }

      var n1 = parseInt(a[0], 10);
      var n2 = parseInt(b[0], 10);
      var bothNumeric = !isNaN(n1) && !isNaN(n2);
      if (bothNumeric && n1 !== n2) return n1 - n2;

      return String(a[0]).localeCompare(String(b[0]));
    });

    if (setSelectLoadingUI) setSelectLoadingUI(loadingKind, false, 100);

    return arr.map(function (entry) {
      return entry[0];
    });
  }

  function fillSelect(selectEl, values, selectedValue) {
    if (!selectEl) return;
    selectEl.innerHTML = "";

    values.forEach(function (val) {
      var opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      if (selectedValue && selectedValue === val) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    });

    if (!selectedValue && values.length > 0) {
      selectEl.value = values[0];
    }
  }

  
  function setFromFocus(level3, level4, level5) {
    try {
      window.ToolbarState = window.ToolbarState || {};

      if (typeof level3 === "string" && level3) {
        window.ToolbarState.level_3 = level3;
      }
      if (typeof level4 === "string" && level4) {
        window.ToolbarState.level_4 = level4;
      }
      if (typeof level5 === "string" && level5) {
        window.ToolbarState.level_5 = level5;
      }

      var selL3 = document.getElementById("crumb-l3");
      var selL4 = document.getElementById("crumb-l4");
      var selL5 = document.getElementById("crumb-l5");

      function applyValue(sel, val) {
        if (!sel || !val) return;
        var found = false;
        for (var i = 0; i < sel.options.length; i++) {
          if (String(sel.options[i].value) === String(val)) {
            sel.value = val;
            found = true;
            break;
          }
        }
        // Si no existe, creamos una opción dinámica para reflejar el foco actual
        if (!found) {
          var opt = document.createElement("option");
          opt.value = val;
          opt.textContent = val;
          sel.appendChild(opt);
          sel.value = val;
        }
      }

      applyValue(selL3, window.ToolbarState.level_3);
      applyValue(selL4, window.ToolbarState.level_4);
      applyValue(selL5, window.ToolbarState.level_5);
    } catch (e) {
      console.warn("[Toolbar] error en setFromFocus", e);
    }
  }


async function initBreadcrumb() {
    var container = document.getElementById("tbar-breadcrumb");
    if (!container) return;

    var footerStatic = document.getElementById("ftr-crumb-static");
    if (footerStatic) {
      footerStatic.innerHTML = "";
      footerStatic.classList.add("ftr-crumb-static");
    }

    var prefs = getPrefs();
    var lang = getLang();
    var client = getSupabaseClient();

    var collection = prefs.collection || null;
    var corpus = prefs.corpus || null;

    container.innerHTML = "";
    container.classList.add("crumbs");

    // Botón: Collection > Corpus >  (en negrita) → abre Preferencias
    var prefsBtn = document.createElement("button");
    prefsBtn.type = "button";
    prefsBtn.className = "crumb-link";

    var colLabel = collection || (lang === "en" ? "Collection" : "Collection");
    var corpusLabel = corpus || "Corpus";

    var strongCol = document.createElement("strong");
    strongCol.textContent = colLabel;

    var sep1 = document.createElement("span");
    sep1.className = "crumb-sep";
    sep1.textContent = " > ";

    var strongCorpus = document.createElement("strong");
    strongCorpus.textContent = corpusLabel;

    var sep2 = document.createElement("span");
    sep2.className = "crumb-sep";
    sep2.textContent = " > ";

    prefsBtn.appendChild(strongCol);
    prefsBtn.appendChild(sep1);
    prefsBtn.appendChild(strongCorpus);
    prefsBtn.appendChild(sep2);

    if (footerStatic) {
      footerStatic.appendChild(prefsBtn);
    }

    // Selects para level_3, level_4, level_5
    var selL3 = document.createElement("select");
    selL3.id = "crumb-l3";
    selL3.className = "crumb-select";

    var selL4 = document.createElement("select");
    selL4.id = "crumb-l4";
    selL4.className = "crumb-select";

    var selL5 = document.createElement("select");
    selL5.id = "crumb-l5";
    selL5.className = "crumb-select";

    container.appendChild(selL3);
    container.appendChild(selL4);
    container.appendChild(selL5);

    var setSelectLoadingUI = makeSelectLoadingHelper(selL3, selL4, selL5);

    // Click → Preferencias
    prefsBtn.addEventListener("click", function () {
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("preferences");
      }
    });

    if (!client || !collection || !corpus) {
      selL3.disabled = true;
      selL4.disabled = true;
      selL5.disabled = true;
      fillSelect(selL3, [], null);
      fillSelect(selL4, [], null);
      fillSelect(selL5, [], null);
      return;
    }

    window.ToolbarState = window.ToolbarState || {};
    var prevL3 = window.ToolbarState.level_3 || "";
    var prevL4 = window.ToolbarState.level_4 || "";
    var prevL5 = window.ToolbarState.level_5 || "";

    var baseFilters = {
      language_code: prefs.language || "es",
      level_1: collection,
      level_2: corpus,
    };

    // ---- CARGA INICIAL (auto primer valor) ----
    var selectedL3 = "";
    var selectedL4 = "";
    var selectedL5 = "";

    // level_3
    var level3Values = await loadDistinctLevel(
      "level_3",
      baseFilters,
      "l3",
      setSelectLoadingUI
    );

    if (!level3Values.length) {
      fillSelect(selL3, [], null);
      fillSelect(selL4, [], null);
      fillSelect(selL5, [], null);
      selL3.disabled = true;
      selL4.disabled = true;
      selL5.disabled = true;
      maybeRefreshNavigator();
      return;
    }

    if (prevL3 && level3Values.indexOf(prevL3) !== -1) {
      selectedL3 = prevL3;
    } else {
      selectedL3 = level3Values[0];
    }
    fillSelect(selL3, level3Values, selectedL3);
    selL3.disabled = false;

    // level_4
    var filtersL4 = Object.assign({}, baseFilters, { level_3: selectedL3 });
    var level4Values = await loadDistinctLevel(
      "level_4",
      filtersL4,
      "l4",
      setSelectLoadingUI
    );

    if (!level4Values.length) {
      fillSelect(selL4, [], null);
      fillSelect(selL5, [], null);
      selL4.disabled = true;
      selL5.disabled = true;
      window.ToolbarState.level_3 = selectedL3;
      window.ToolbarState.level_4 = "";
      window.ToolbarState.level_5 = "";
      maybeRefreshNavigator();
      return;
    }

    if (prevL4 && level4Values.indexOf(prevL4) !== -1) {
      selectedL4 = prevL4;
    } else {
      selectedL4 = level4Values[0];
    }
    fillSelect(selL4, level4Values, selectedL4);
    selL4.disabled = false;

    // level_5
    var filtersL5 = Object.assign({}, baseFilters, {
      level_3: selectedL3,
      level_4: selectedL4,
    });
    var level5Values = await loadDistinctLevel(
      "level_5",
      filtersL5,
      "l5",
      setSelectLoadingUI
    );

    if (!level5Values.length) {
      fillSelect(selL5, [], null);
      selL5.disabled = true;
      window.ToolbarState.level_3 = selectedL3;
      window.ToolbarState.level_4 = selectedL4;
      window.ToolbarState.level_5 = "";
      maybeRefreshNavigator();
    } else {
      if (prevL5 && level5Values.indexOf(prevL5) !== -1) {
        selectedL5 = prevL5;
      } else {
        selectedL5 = level5Values[0];
      }
      fillSelect(selL5, level5Values, selectedL5);
      selL5.disabled = false;

      window.ToolbarState.level_3 = selectedL3;
      window.ToolbarState.level_4 = selectedL4;
      window.ToolbarState.level_5 = selectedL5;
      maybeRefreshNavigator(); // breadcrumb completo ⇒ mostramos Navigator
    }

    // ---- Cambios manuales ----
    selL3.addEventListener("change", async function () {
      var chosenL3 = selL3.value || "";
      window.ToolbarState.level_3 = chosenL3;
      window.ToolbarState.level_4 = "";
      window.ToolbarState.level_5 = "";

      if (!chosenL3) {
        fillSelect(selL4, [], null);
        fillSelect(selL5, [], null);
        selL4.disabled = true;
        selL5.disabled = true;
        maybeRefreshNavigator();
        return;
      }

      var filtersL4c = Object.assign({}, baseFilters, { level_3: chosenL3 });
      var level4Vals = await loadDistinctLevel(
        "level_4",
        filtersL4c,
        "l4",
        setSelectLoadingUI
      );

      if (!level4Vals.length) {
        fillSelect(selL4, [], null);
        fillSelect(selL5, [], null);
        selL4.disabled = true;
        selL5.disabled = true;
        maybeRefreshNavigator();
        return;
      }

      var autoL4 = level4Vals[0];
      fillSelect(selL4, level4Vals, autoL4);
      selL4.disabled = false;

      var filtersL5c = Object.assign({}, baseFilters, {
        level_3: chosenL3,
        level_4: autoL4,
      });
      var level5Vals = await loadDistinctLevel(
        "level_5",
        filtersL5c,
        "l5",
        setSelectLoadingUI
      );

      if (!level5Vals.length) {
        fillSelect(selL5, [], null);
        selL5.disabled = true;
        window.ToolbarState.level_3 = chosenL3;
        window.ToolbarState.level_4 = autoL4;
        window.ToolbarState.level_5 = "";
        maybeRefreshNavigator();
        return;
      }

      var autoL5 = level5Vals[0];
      fillSelect(selL5, level5Vals, autoL5);
      selL5.disabled = false;

      window.ToolbarState.level_3 = chosenL3;
      window.ToolbarState.level_4 = autoL4;
      window.ToolbarState.level_5 = autoL5;
      maybeRefreshNavigator();
    });

    selL4.addEventListener("change", async function () {
      var chosenL3 = selL3.value || "";
      var chosenL4 = selL4.value || "";
      window.ToolbarState.level_3 = chosenL3;
      window.ToolbarState.level_4 = chosenL4;
      window.ToolbarState.level_5 = "";

      if (!chosenL4) {
        fillSelect(selL5, [], null);
        selL5.disabled = true;
        maybeRefreshNavigator();
        return;
      }

      var filtersL5c2 = Object.assign({}, baseFilters, {
        level_3: chosenL3,
        level_4: chosenL4,
      });
      var level5Vals2 = await loadDistinctLevel(
        "level_5",
        filtersL5c2,
        "l5",
        setSelectLoadingUI
      );

      if (!level5Vals2.length) {
        fillSelect(selL5, [], null);
        selL5.disabled = true;
        window.ToolbarState.level_5 = "";
        maybeRefreshNavigator();
        return;
      }

      var autoL5b = level5Vals2[0];
      fillSelect(selL5, level5Vals2, autoL5b);
      selL5.disabled = false;

      window.ToolbarState.level_5 = autoL5b;
      maybeRefreshNavigator();
    });

    selL5.addEventListener("change", function () {
      window.ToolbarState.level_3 = selL3.value || "";
      window.ToolbarState.level_4 = selL4.value || "";
      window.ToolbarState.level_5 = selL5.value || "";
      maybeRefreshNavigator();
    });
  }

  function init() {
    initSearch();
    initBreadcrumb();
  }

  async function refreshBreadcrumb() {
    await initBreadcrumb();
  }

  documentReady(init);

  return {
    init: init,
    refreshBreadcrumb: refreshBreadcrumb,
    setFromFocus: setFromFocus,
  };
})();
