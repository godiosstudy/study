// main.preferences.js – vista de preferencias de usuario
// Si hay usuario logueado, al guardar también se suben a SQL (tabla profiles)
// p_color = HEX (sin #), p_light = boolean, p_font_type texto libre, p_font_size int 8–25.
window.MainPreferences = (function () {
  function getLang() {
    try {
      const store = window.PrefsStore;
      if (store && typeof store.load === "function") {
        const prefs = store.load();
        if (prefs && prefs.language) return prefs.language;
      }
    } catch (e) {}
    return "es";
  }

  const TEXTS = {
    es: {
      collection: "Colección",
      corpus: "Corpus",
      fontFamily: "Tipo de letra",
      fontSize: "Tamaño",
      language: "Idioma",
      color: "Color",
      light: "Luz",
      preview: "Así se verá el texto con las preferencias seleccionadas.",
      reset: "Restablecer",
      cancel: "Cancelar",
      save: "Guardar",
    },
    en: {
      collection: "Collection",
      corpus: "Corpus",
      fontFamily: "Font family",
      fontSize: "Size",
      language: "Language",
      color: "Color",
      light: "Light",
      preview: "This is how the text will look with the selected preferences.",
      reset: "Reset",
      cancel: "Cancel",
      save: "Save",
    },
  };

  function w(wordKey, fallback) {
    if (window.SystemWords && typeof window.SystemWords.t === "function") {
      return window.SystemWords.t(wordKey, fallback);
    }
    return fallback;
  }

  // =========================================================
  // Entries (Collections / Corpus) – helpers y caches
  // =========================================================
  var entriesCollectionsCache = {}; // por idioma: { es: [..], en: [..] }
  var entriesCorpusCache = {}; // por idioma+collection: { "es::Genesis": [..] }
  var collectionListEl = null; // listado collection > corpus

  function ensureOption(selectEl, value, label) {
    if (!selectEl) return;
    var val = value == null ? "" : String(value);
    var exists = Array.prototype.some.call(selectEl.options || [], function (
      opt
    ) {
      return opt && String(opt.value) === val;
    });
    if (!exists) {
      var opt = document.createElement("option");
      opt.value = val;
      opt.textContent = label != null ? String(label) : val;
      selectEl.appendChild(opt);
    }
    selectEl.value = val;
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
      console.warn("[Prefs] error obteniendo cliente Supabase", e);
    }
    return null;
  }

  function t(key, wordKey) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    var fallback = dict[key] || key;
    if (wordKey) {
      return w(wordKey, fallback);
    }
    return fallback;
  }

  async function loadAvailableLanguages() {
    var client = getSupabaseClient();
    if (!client) return ["en"];
    try {
      var res = await client
        .from("system_languages_available")
        .select("lang, is_complete");
      if (res.error) {
        console.warn("[Preferences] error loading languages", res.error);
        return ["en"];
      }
      var list =
        (res.data || [])
          .filter(function (row) {
            return row.is_complete;
          })
          .map(function (row) {
            return row.lang;
          }) || [];
      if (list.indexOf("en") === -1) list.push("en");
      return list;
    } catch (e) {
      console.warn("[Preferences] exception loading languages", e);
      return ["en"];
    }
  }

  function showMessage(type, text) {
    try {
      if (
        window.HeaderMessages &&
        typeof window.HeaderMessages.show === "function"
      ) {
        window.HeaderMessages.show(text, {
          type: type || "info",
          duration: 7000,
        });
      } else {
        console.log("[Prefs][" + type + "]", text);
      }
    } catch (e) {}
  }

  // Helpers para mapear prefs -> SQL
  function sqlLanguage(lang) {
    if (!lang) return "es";
    return String(lang);
  }

  // p_color en SQL = HEX sin # (ej "FF0000")
  function sqlColorFromPrefs(prefs) {
    if (!prefs || !prefs.colorHex) return null;
    let v = String(prefs.colorHex).trim();
    if (!v) return null;
    if (v[0] === "#") v = v.slice(1);
    v = v.toUpperCase();
    // Aceptamos 6 dígitos hex
    if (!/^[0-9A-F]{6}$/.test(v)) return null;
    return v;
  }

  function sqlFontType(font) {
    if (!font) return null;
    return String(font);
  }

  function sqlFontSize(fontSizePt) {
    var n = parseInt(fontSizePt, 10);
    if (isNaN(n)) n = 12;
    if (n < 8) n = 8;
    if (n > 25) n = 25;
    return n;
  }

  function clearNavigationState() {
    try {
      window.ToolbarState = { level_3: "", level_4: "", level_5: "" };
      if (window.Toolbar && typeof window.Toolbar.refreshBreadcrumb === "function") {
        window.Toolbar.refreshBreadcrumb();
      }
    } catch (e) {
      console.warn("[Prefs] clearNavigationState error", e);
    }
  }

  function applyToolbarDefaultsForPrefs(prefs) {
    try {
      if (
        !prefs ||
        !prefs.collection ||
        !prefs.corpus ||
        !window.EntriesMemory ||
        typeof window.EntriesMemory.getRows !== "function"
      ) {
        return;
      }
      var rows = window.EntriesMemory.getRows() || [];
      if (!rows.length) return;
      var filtered = rows.filter(function (r) {
        return r && r.level_1 === prefs.collection && r.level_2 === prefs.corpus;
      });
      if (!filtered.length) return;
      filtered.sort(function (a, b) {
        var ao =
          typeof a.entry_order === "number" ? a.entry_order : Number.MAX_SAFE_INTEGER;
        var bo =
          typeof b.entry_order === "number" ? b.entry_order : Number.MAX_SAFE_INTEGER;
        return ao - bo;
      });
      var first = null;
      for (var i = 0; i < filtered.length; i++) {
        var r = filtered[i];
        if (r && r.level_3 && r.level_4 && r.level_5) {
          first = r;
          break;
        }
      }
      if (!first) first = filtered[0] || {};
      window.ToolbarState = window.ToolbarState || {};
      window.ToolbarState.level_3 = first.level_3 || "";
      window.ToolbarState.level_4 = first.level_4 || "";
      window.ToolbarState.level_5 = first.level_5 || "";
      if (window.Toolbar && typeof window.Toolbar.refreshBreadcrumb === "function") {
        window.Toolbar.refreshBreadcrumb();
      }
    } catch (e) {
      console.warn("[Prefs] applyToolbarDefaultsForPrefs error", e);
    }
  }

  async function render(container) {
    if (!container) return;
    container.innerHTML = "";

    var availableLangs = await loadAvailableLanguages();

    const panel = document.createElement("div");
    panel.className = "panel panel-single preferences-view";

    panel.innerHTML = [
      '<div class="main-view-header">',
      '  <h1 class="main-view-title">' +
        w("preferences.title", "Preferencias") +
        "</h1>",
      "</div>",
      '<form id="preferences-form">',
      '  <div class="form-grid prefs-grid">',
      '    <label for="pref-lang">',
      "      <span>" +
        w("preferences.language", t("language")) +
        "</span>",
      '      <select id="pref-lang" name="p_language"></select>',
      "    </label>",
      '    <label for="pref-collection" class="prefs-hidden">',
      "      <span>" +
        w("preferences.collection", t("collection")) +
        "</span>",
      '      <select id="pref-collection">',
      '        <option value="">' +
        w("preferences.auto", "(auto)") +
        "</option>",
      "      </select>",
      "    </label>",
      '    <label for="pref-corpus" class="prefs-hidden">',
      "      <span>" +
        w("preferences.corpus", t("corpus")) +
        "</span>",
      '      <select id="pref-corpus">',
      '        <option value="">' +
        w("preferences.auto", "(auto)") +
        "</option>",
      "      </select>",
      "    </label>",
      '    <div class="prefs-font-row">',
      '      <label for="pref-font-family">',
      "        <span>" +
          w("preferences.fontFamily", t("fontFamily")) +
          "</span>",
      '        <select id="pref-font-family"></select>',
      "      </label>",
      '      <label for="pref-font-size">',
      "        <span>" +
          w("preferences.fontSize", t("fontSize")) +
          "</span>",
      '        <div class="prefs-font-size">',
      '          <input type="range" id="pref-font-size" min="8" max="25" />',
      '          <span id="pref-font-size-val"></span>',
      "        </div>",
      "      </label>",
      "    </div>",
      '    <label for="pref-color">',
      "      <span>" + w("preferences.color", t("color")) + "</span>",
      '      <div class="prefs-color">',
      '        <input type="color" id="pref-color" />',
      '        <input type="text" id="pref-color-hex" maxlength="7" />',
      "      </div>",
      "    </label>",
      '    <label for="pref-preview">',
      "      <span>" +
        w("preferences.preview", t("preview")) +
        "</span>",
      '      <div id="pref-preview" class="prefs-preview">',
      '        <span id="prefs-preview-text">' +
        w("preferences.preview", t("preview")) +
        "</span>",
      "      </div>",
      "    </label>",
      '    <div class="collection-radio-section">',
      '      <span class="collection-radio-title">' + w("preferences.corpusList", "Selecciona corpus") + "</span>",
      '      <div id="pref-collection-list" class="collection-radio-list"></div>',
      "    </div>",
      "  </div>",
      '  <div class="form-actions prefs-actions">',
      '    <button type="button" class="chip" id="pref-reset">' +
        w("preferences.reset", t("reset")) +
        "</button>",
      '    <button type="button" class="chip ghost" id="pref-cancel">' +
        w("common.cancel", t("cancel")) +
        "</button>",
      '    <button type="submit" class="chip primary" id="pref-save">' +
        w("common.save", t("save")) +
        "</button>",
      "  </div>",
      "</form>",
    ].join("\n");

    container.appendChild(panel);

    var langEl = panel.querySelector("#pref-lang");
    if (langEl) {
      langEl.innerHTML = (availableLangs || [])
        .map(function (l) {
          return '<option value="' + l + '">' + l.toUpperCase() + "</option>";
        })
        .join("");
    }

    wireLogic(panel);
    applyTexts(panel);
  }

  function applyTexts(root) {
    const titleEl = root.querySelector("h1");
    if (titleEl) titleEl.textContent = w("preferences.title", "Preferencias");

    function setLabelText(forId, key, fallbackKey) {
      const lbl = root.querySelector('label[for="' + forId + '"]');
      if (!lbl) return;
      const span = lbl.querySelector("span") || lbl;
      span.textContent = w(key, t(fallbackKey));
    }

    setLabelText("pref-collection", "preferences.collection", "collection");
    setLabelText("pref-corpus", "preferences.corpus", "corpus");
    setLabelText("pref-font-family", "preferences.fontFamily", "fontFamily");
    setLabelText("pref-font-size", "preferences.fontSize", "fontSize");
    setLabelText("pref-lang", "preferences.language", "language");
    setLabelText("pref-color", "preferences.color", "color");

    const btnReset = root.querySelector("#pref-reset");
    const btnCancel = root.querySelector("#pref-cancel");
    const btnSave = root.querySelector("#pref-save");
    if (btnReset) btnReset.textContent = w("preferences.reset", t("reset"));
    if (btnCancel) btnCancel.textContent = w("common.cancel", t("cancel"));
    if (btnSave) btnSave.textContent = w("common.save", t("save"));

    const prev = root.querySelector("#prefs-preview-text");
    if (prev) prev.textContent = w("preferences.preview", t("preview"));
  }

  // ======== Descubrir fuentes desde @font-face en CSS ========
  let cachedFontFamilies = null;

  function cleanFontName(name) {
    if (!name) return "";
    return name.trim().replace(/^['"]+|['"]+$/g, "");
  }

  function getFontFamiliesFromCSS() {
    if (cachedFontFamilies) return cachedFontFamilies;

    const famSet = new Set();
    const sheets = Array.from(document.styleSheets || []);

    sheets.forEach((sheet) => {
      let rules;
      try {
        rules = sheet.cssRules || sheet.rules;
      } catch (e) {
        return;
      }
      if (!rules) return;

      Array.from(rules).forEach((rule) => {
        const isFontFace =
          (window.CSSRule && rule.type === CSSRule.FONT_FACE_RULE) ||
          (rule.constructor && rule.constructor.name === "CSSFontFaceRule") ||
          (rule.cssText && /^@font-face/i.test(rule.cssText));

        if (!isFontFace) return;

        const famRaw =
          (rule.style &&
            (rule.style.getPropertyValue("font-family") ||
              rule.style.fontFamily)) ||
          "";

        const fam = cleanFontName(famRaw);
        if (fam) famSet.add(fam);
      });
    });

    let list = Array.from(famSet);

    if (!list.length) {
      list = ["System"];
    } else {
      list.sort();
      if (!list.includes("System")) list.unshift("System");
    }

    cachedFontFamilies = list;
    return cachedFontFamilies;
  }

  function fillFonts(selectEl, fontsList, current) {
    if (!selectEl) return;

    selectEl.innerHTML = "";

    fontsList.forEach((fam) => {
      const opt = document.createElement("option");
      opt.value = fam;
      opt.textContent = fam;
      if (!current && fam === "System") opt.selected = true;
      if (current && fam === current) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  function wireLogic(root) {
    var PrefsStore = window.PrefsStore;

    var prefs =
      (PrefsStore && PrefsStore.load && PrefsStore.load()) ||
      (PrefsStore && PrefsStore.DEFAULTS) ||
      {};

    var collectionEl = root.querySelector("#pref-collection");
    var corpusEl = root.querySelector("#pref-corpus");
    var formEl = root.querySelector("#preferences-form");
    var fontFamilyEl = root.querySelector("#pref-font-family");
    var fontSizeEl = root.querySelector("#pref-font-size");
    var fontSizeValEl = root.querySelector("#pref-font-size-val");
    var langEl = root.querySelector("#pref-lang");
    var colorEl = root.querySelector("#pref-color");
    var colorHexEl = root.querySelector("#pref-color-hex");
    var resetBtn = root.querySelector("#pref-reset");
    var cancelBtn = root.querySelector("#pref-cancel");
    var saveBtn = root.querySelector("#pref-save");
    var previewEl = root.querySelector("#prefs-preview-text");
    collectionListEl = root.querySelector("#pref-collection-list");

    function updateSaveButtonState() {
      if (!saveBtn) return;
      // Siempre habilitado para permitir guardar selección de colección/corpus
      saveBtn.disabled = false;
    }

    var fontsList = getFontFamiliesFromCSS();
    var client = getSupabaseClient();
    var entriesLang = prefs.language || getLang();

    function updatePreviewStyle() {
      if (!previewEl) return;

      var fontVal = fontFamilyEl ? fontFamilyEl.value : "System";
      if (fontVal && fontVal !== "System") {
        previewEl.style.fontFamily =
          "'" + fontVal + "', var(--app-font-fallback)";
      } else {
        previewEl.style.fontFamily = "var(--app-font-fallback)";
      }

      var sizeVal =
        fontSizeEl && fontSizeEl.value
          ? Number(fontSizeEl.value)
          : prefs.fontSizePt;
      previewEl.style.fontSize = (sizeVal || 12) + "pt";

      var colorVal =
        (colorEl && colorEl.value) ||
        (colorHexEl && colorHexEl.value) ||
        prefs.colorHex ||
        "#000000";
      previewEl.style.color = colorVal;
    }

    function applyFromPrefs() {
      // Collections / Corpus se gestionan con entries (initEntriesCombos)

      var currentFont = prefs.font || "System";
      fillFonts(fontFamilyEl, fontsList, currentFont);

      if (fontSizeEl) {
        var fs = prefs.fontSizePt || 12;
        if (fs < 8) fs = 8;
        if (fs > 25) fs = 25;
        fontSizeEl.value = fs;
      }
      if (fontSizeValEl) {
        var txtSize = prefs.fontSizePt || 12;
        fontSizeValEl.textContent = txtSize + " pt";
      }

      if (langEl) langEl.value = prefs.language || "es";

      if (collectionEl && prefs.collection) {
        ensureOption(collectionEl, prefs.collection, prefs.collection);
      }
      if (corpusEl && prefs.corpus) {
        ensureOption(corpusEl, prefs.corpus, prefs.corpus);
      }

      var color = prefs.colorHex || "#000000";
      if (colorEl) colorEl.value = color;
      if (colorHexEl) colorHexEl.value = color;

      updatePreviewStyle();
    }

    // === cambio de idioma dentro de Preferencias ===
    if (langEl) {
      langEl.addEventListener("change", async function () {
        var newLang = langEl.value || "es";
        prefs.language = newLang;

        // vaciar caches para ese nuevo idioma
        entriesCollectionsCache = {};
        entriesCorpusCache = {};
        entriesLang = newLang;

        // precargar meta (collections/corpus) para el nuevo idioma usando entries_meta
        try {
          if (
            window.EntriesMemory &&
            typeof window.EntriesMemory.preloadMetaForLang === "function"
          ) {
            await window.EntriesMemory.preloadMetaForLang(newLang);
          }
        } catch (eMetaChange) {
          console.warn(
            "[Prefs] preloadMetaForLang on language change error",
            eMetaChange
          );
        }

        if (client && typeof initEntriesCombos === "function") {
          try {
            await initEntriesCombos();
          } catch (eInit) {
            console.warn(
              "[Prefs] initEntriesCombos error after language change",
              eInit
            );
          }
        }
      });
    }

    // ====== Entradas (entries) para Collections / Corpus ======

    // loading en selects de prefs (Colección / Corpus)
    function setLoadingUI(kind, active, percent) {
      var selectEl =
        kind === "collection"
          ? collectionEl
          : kind === "corpus"
          ? corpusEl
          : null;
      if (!selectEl) return;

      if (!active) {
        selectEl.disabled = false;
        selectEl.classList.remove("prefs-select-loading");
        selectEl.style.backgroundImage = "";
        selectEl.style.color = "";
        return;
      }

      selectEl.disabled = true;
      selectEl.classList.add("prefs-select-loading");

      var p =
        typeof percent === "number" && percent >= 0
          ? Math.min(100, Math.round(percent))
          : 0;

      var lang = getLang();
      var baseEs =
        kind === "collection" ? "Cargando Collections" : "Cargando Corpus";
      var baseEn =
        kind === "collection" ? "Loading Collections" : "Loading Corpus";

      var label =
        lang === "en"
          ? baseEn + " " + p + "%"
          : baseEs + " al " + p + "%";

      selectEl.innerHTML = "";
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = label;
      selectEl.appendChild(opt);

      selectEl.style.backgroundImage =
        "linear-gradient(to right, var(--accent, #154a8e) " +
        p +
        "%, rgba(0,0,0,0.06) " +
        p +
        "%)";

      if (p < 50) {
        selectEl.style.color = "#154a8e";
      } else {
        selectEl.style.color = "#ffffff";
      }
    }

    // Nueva versión: construir colecciones desde EntriesMemory en memoria (sin tocar Supabase)
    async function loadCollections(langCode) {
      var cacheKey = langCode || "default";
      if (entriesCollectionsCache[cacheKey]) {
        return entriesCollectionsCache[cacheKey];
      }

      var values = null;

      // 1) Intentar obtener desde la meta ya precargada
      try {
        if (
          window.EntriesMemory &&
          typeof window.EntriesMemory.getCollectionsForLang === "function"
        ) {
          values = window.EntriesMemory.getCollectionsForLang(langCode);
        }
      } catch (eMeta) {
        console.warn("[Prefs] loadCollections meta error", eMeta);
      }

      // 3) Si ya tenemos valores desde meta, cacheamos y devolvemos
      if (values && values.length) {
        entriesCollectionsCache[cacheKey] = values;
        return values;
      }

      // 4) Fallback final: derivar a partir de las filas actualmente cargadas en memoria
      if (
        !window.EntriesMemory ||
        typeof window.EntriesMemory.getRows !== "function"
      ) {
        return [];
      }

      var rows = window.EntriesMemory.getRows();
      var set = new Set();

      rows.forEach(function (row) {
        if (row.language_code && row.language_code !== langCode) return;
        if (row.level_1) set.add(row.level_1);
      });

      values = Array.from(set);
      values.sort();
      entriesCollectionsCache[cacheKey] = values;
      return values;
    }

    async function loadCorpusForCollection(
      langCode,
      collectionValue,
      selectedCorpus
    ) {
      var cacheKey = (langCode || "default") + "::" + (collectionValue || "");
      var values = entriesCorpusCache[cacheKey] || null;

      if (!values) {
        // 1) Intentar primero con la meta ya precargada
        try {
          if (
            window.EntriesMemory &&
            typeof window.EntriesMemory.getCorpusForLangCollection ===
              "function"
          ) {
            values = window.EntriesMemory.getCorpusForLangCollection(
              langCode,
              collectionValue
            );
          }
        } catch (eMeta) {
          console.warn("[Prefs] loadCorpusForCollection meta error", eMeta);
        }

        // 3) Fallback: derivar de las filas actualmente cargadas en memoria
        if (!values || !values.length) {
          if (
            !window.EntriesMemory ||
            typeof window.EntriesMemory.getRows !== "function"
          ) {
            // Sin datos en memoria todavía
            if (corpusEl) corpusEl.innerHTML = "";
            entriesCorpusCache[cacheKey] = [];
            return [];
          }

          var rows = window.EntriesMemory.getRows();
          var set = new Set();

          rows.forEach(function (row) {
            if (row.language_code && row.language_code !== langCode) return;
            if (row.level_1 !== collectionValue) return;
            if (row.level_2) set.add(row.level_2);
          });

          values = Array.from(set);
          values.sort();
        }

        entriesCorpusCache[cacheKey] = values || [];
      }

      // Si no hay select en DOM o no hay corpus, solo devolvemos la lista
      if (!corpusEl) {
        return values;
      }

      corpusEl.innerHTML = "";

      if (!values.length) {
        // No hay corpus para esta colección
        if (typeof updateSaveButtonState === "function") {
          updateSaveButtonState();
        }
        return values;
      }

      var effectiveSelected = null;
      if (selectedCorpus && values.indexOf(selectedCorpus) >= 0) {
        effectiveSelected = selectedCorpus;
      } else if (prefs && prefs.corpus && values.indexOf(prefs.corpus) >= 0) {
        effectiveSelected = prefs.corpus;
      } else {
        effectiveSelected = values[0];
      }

      values.forEach(function (val) {
        var opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        if (effectiveSelected && effectiveSelected === val) opt.selected = true;
        corpusEl.appendChild(opt);
      });

      var finalValue = corpusEl.value || effectiveSelected || null;
      if (prefs) {
        prefs.corpus = finalValue;
        try {
          if (
            window.PrefsStore &&
            typeof window.PrefsStore.save === "function"
          ) {
            window.PrefsStore.save(prefs);
          }
        } catch (e) {
          console.warn("[Prefs] save prefs.corpus error", e);
        }
      }

      if (typeof updateSaveButtonState === "function") {
        updateSaveButtonState();
      }

      var list = await buildCollectionCorpusList();
      renderCollectionList(list, prefs.collection, prefs.corpus);

      return values;
    }

    function fillCollectionsSelect(collections, selected) {
      if (!collectionEl) return;
      collectionEl.innerHTML = "";

      collections.forEach(function (val) {
        var opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        if (selected && selected === val) opt.selected = true;
        collectionEl.appendChild(opt);
      });

      if (selected && collections.indexOf(selected) === -1) {
        ensureOption(collectionEl, selected, selected);
      } else if (selected) {
        collectionEl.value = selected;
      }
    }

    async function buildCollectionCorpusList() {
      var list = [];
      var client = getSupabaseClient();
      if (client) {
        try {
          var res = await client
            .from("entries_meta")
            .select("level_1, level_2")
            .order("level_1", { ascending: true })
            .order("level_2", { ascending: true });
          if (res && res.error) {
            console.warn("[Prefs] buildCollectionCorpusList error", res.error);
          } else {
            (res.data || []).forEach(function (row) {
              if (!row.level_1 || !row.level_2) return;
              var key = row.level_1 + "||" + row.level_2;
              list.push({
                collection: row.level_1,
                corpus: row.level_2,
                key: key,
              });
            });
          }
        } catch (e) {
          console.warn("[Prefs] buildCollectionCorpusList exception", e);
        }
      }

      if (!list.length) {
        // Fallback a meta precargada en EntriesMemory si no hay cliente o no devolviA3 filas
        try {
          if (
            window.EntriesMemory &&
            typeof window.EntriesMemory.getRows === "function"
          ) {
            var rows = window.EntriesMemory.getRows() || [];
            rows.forEach(function (row) {
              if (!row.level_1 || !row.level_2) return;
              var key = row.level_1 + "||" + row.level_2;
              list.push({
                collection: row.level_1,
                corpus: row.level_2,
                key: key,
              });
            });
          }
        } catch (eFallback) {
          console.warn("[Prefs] fallback buildCollectionCorpusList error", eFallback);
        }
      }

      var seen = {};
      var deduped = [];
      list.forEach(function (item) {
        if (seen[item.key]) return;
        seen[item.key] = true;
        deduped.push(item);
      });
      return deduped;
    }

    function renderCollectionList(list, selectedCollection, selectedCorpus) {
      if (!collectionListEl) return;
      var currentKey = (selectedCollection || "") + "||" + (selectedCorpus || "");
      if ((!selectedCollection || !selectedCorpus) && list && list.length) {
        currentKey = list[0].key;
        prefs.collection = list[0].collection;
        prefs.corpus = list[0].corpus;
        ensureOption(collectionEl, prefs.collection, prefs.collection);
        ensureOption(corpusEl, prefs.corpus, prefs.corpus);
      }
      var html = [];
      list.forEach(function (item) {
        var key = item.key;
        var checked = key === currentKey ? "checked" : "";
        html.push(
          '<label class="collection-radio-item">' +
            '<input type="radio" name="pref-collection-radio" value="' +
            key +
            '" ' +
            checked +
            ' /> ' +
            (item.collection || "") +
            " > " +
            (item.corpus || "") +
            "</label>"
        );
      });
      if (!html.length) {
        html.push('<div class="collection-radio-empty">' + w("preferences.collectionEmpty", "(sin colecciones)") + "</div>");
      }
      collectionListEl.innerHTML = html.join("\n");

      var radios = collectionListEl.querySelectorAll('input[name="pref-collection-radio"]');
      radios.forEach(function (r) {
        r.addEventListener("change", function () {
          var val = r.value || "";
          var parts = val.split("||");
          var col = parts[0] || "";
          var corp = parts[1] || "";
          ensureOption(collectionEl, col, col);
          ensureOption(corpusEl, corp, corp);
          prefs.collection = col || null;
          prefs.corpus = corp || null;
          if (typeof updateSaveButtonState === "function") updateSaveButtonState();
        });
      });
    }

    async function initEntriesCombos() {
      if (!collectionEl) return;

      var langCode = entriesLang;
      if (!langCode) {
        langCode = typeof getLang === "function" ? getLang() : "es";
      }

      var collections = await loadCollections(langCode);

      if ((!collections || !collections.length) && langCode !== "en") {
        langCode = "en";
        collections = await loadCollections(langCode);
      }

      if (!collections || !collections.length) {
        collectionEl.innerHTML = "";
        if (corpusEl) corpusEl.innerHTML = "";
      }

      var selectedCollection =
        (prefs && prefs.collection) || collections[0];

      fillCollectionsSelect(collections, selectedCollection);

      if (!prefs.collection && selectedCollection) {
        prefs.collection = selectedCollection;
        if (window.PrefsStore && typeof window.PrefsStore.save === "function") {
          try {
            window.PrefsStore.save(prefs);
          } catch (e) {
            console.warn("[Prefs] save prefs.collection error", e);
          }
        }
      }

      await loadCorpusForCollection(langCode, selectedCollection, prefs.corpus);

      entriesLang = langCode;

      var list = await buildCollectionCorpusList();
      renderCollectionList(list, prefs.collection, prefs.corpus);

      if (typeof updateSaveButtonState === "function") {
        updateSaveButtonState();
      }
    }

    if (collectionEl) {
      collectionEl.addEventListener("change", async function () {
        var newCollection = collectionEl.value || "";
        prefs.collection = newCollection || null;
        if (!newCollection) {
          if (corpusEl) corpusEl.innerHTML = "";
          renderCollectionList([], null, null);
          if (typeof updateSaveButtonState === "function") {
            updateSaveButtonState();
          }
          return;
        }
        await loadCorpusForCollection(entriesLang, newCollection, null);
        var list = await buildCollectionCorpusList();
        renderCollectionList(list, prefs.collection, prefs.corpus);
        if (typeof updateSaveButtonState === "function") {
          updateSaveButtonState();
        }
      });
    }

    if (corpusEl) {
      corpusEl.addEventListener("change", async function () {
        var newCorpus = corpusEl.value || "";
        prefs.corpus = newCorpus || null;
        if (window.PrefsStore && typeof window.PrefsStore.save === "function") {
          try {
            window.PrefsStore.save(prefs);
          } catch (e) {
            console.warn("[Prefs] save prefs.corpus (change) error", e);
          }
        }
        var list = await buildCollectionCorpusList();
        renderCollectionList(list, prefs.collection, prefs.corpus);
        if (typeof updateSaveButtonState === "function") {
          updateSaveButtonState();
        }
      });
    }

    // ====== Listeners de fuentes / color ======
    if (fontSizeEl && fontSizeValEl) {
      fontSizeEl.addEventListener("input", function () {
        fontSizeValEl.textContent = fontSizeEl.value + " pt";
        updatePreviewStyle();
      });
    }

    if (fontFamilyEl) {
      fontFamilyEl.addEventListener("change", function () {
        updatePreviewStyle();
      });
    }

    if (colorEl) {
      colorEl.addEventListener("input", function () {
        if (colorHexEl) colorHexEl.value = colorEl.value;
        updatePreviewStyle();
      });
    }

    if (colorHexEl) {
      colorHexEl.addEventListener("change", function () {
        var v = colorHexEl.value.trim();
        if (!v) return;
        if (v[0] !== "#") v = "#" + v;
        colorHexEl.value = v;
        if (colorEl) colorEl.value = v;
        updatePreviewStyle();
      });
    }

    if (resetBtn && PrefsStore && PrefsStore.DEFAULTS) {
      resetBtn.addEventListener("click", function () {
        prefs = Object.assign({}, PrefsStore.DEFAULTS);
        try {
          PrefsStore.save(prefs);
          PrefsStore.apply(prefs);
        } catch (e) {
          console.warn("Prefs reset error", e);
        }
        applyFromPrefs();
        if (client) {
          initEntriesCombos();
        }
      });
    }

    if (cancelBtn && PrefsStore) {
      cancelBtn.addEventListener("click", function () {
        prefs = PrefsStore.load();
        PrefsStore.apply(prefs);
        if (window.Main && typeof window.Main.showView === "function") {
          window.Main.showView("navigator");
        }
      });
    }

    // ===== Guardar (y sincronizar con perfil si hay usuario en sesión) =====
    if (formEl) {
      formEl.addEventListener("submit", function (ev) {
        if (ev && ev.preventDefault) ev.preventDefault();
        if (ev && ev.stopPropagation) ev.stopPropagation();
      });
    }

    if (saveBtn && PrefsStore) {
      saveBtn.addEventListener("click", async function (ev) {
        if (ev && ev.preventDefault) ev.preventDefault();
        if (ev && ev.stopPropagation) ev.stopPropagation();
        var current =
          (PrefsStore && PrefsStore.load && PrefsStore.load()) ||
          PrefsStore.DEFAULTS ||
          {};
        var selectedFont = fontFamilyEl
          ? fontFamilyEl.value || "System"
          : "System";
        var previousLanguage = current.language || getLang();
        var nextCollection =
          (prefs && prefs.collection) ||
          (collectionEl ? collectionEl.value || null : current.collection);
        var nextCorpus =
          (prefs && prefs.corpus) ||
          (corpusEl ? corpusEl.value || null : current.corpus);

        var next = Object.assign({}, current, {
          collection: nextCollection,
      corpus: nextCorpus,
      font: selectedFont === "System" ? null : selectedFont,
      fontSizePt: fontSizeEl
        ? Number(fontSizeEl.value) || current.fontSizePt
        : current.fontSizePt,
          language: langEl ? langEl.value || current.language : current.language,
          light: current.light || prefs.light,
          colorHex: colorEl ? colorEl.value || current.colorHex : current.colorHex,
        });

        var languageChanged =
          (next.language || getLang()) !==
          (previousLanguage || getLang());

        // 1) Guardar localmente y aplicar al sitio
        try {
          var saved = PrefsStore.save(next);
          PrefsStore.apply(saved);
          prefs = saved;
        } catch (e) {
          console.warn("Prefs save error", e);
        }

        // Notificar al resto de la app
        try {
          if (
            typeof window !== "undefined" &&
            typeof window.dispatchEvent === "function" &&
            typeof window.CustomEvent === "function"
          ) {
            window.dispatchEvent(
              new CustomEvent("prefs:applied", { detail: saved || next })
            );
          }
        } catch (e) {
          console.warn("[Prefs] dispatch prefs:applied error", e);
        }

        // Recargar en segundo plano entries para las nuevas prefs
        try {
          if (
            window.EntriesMemory &&
            typeof window.EntriesMemory.loadForPrefs === "function"
          ) {
            if (typeof window.EntriesMemory.resetCache === "function") {
              window.EntriesMemory.resetCache();
            }
            entriesCollectionsCache = {};
            entriesCorpusCache = {};
            clearNavigationState();
            await window.EntriesMemory.loadForPrefs(saved || next);
            applyToolbarDefaultsForPrefs(saved || next);
          }
        } catch (e) {
          console.warn("[Prefs] reload entries for new prefs error", e);
        }

        // 2) Sincronizar con profiles en SQL si hay usuario logueado
        try {
          if (
            window.AuthSession &&
            typeof window.AuthSession.isLoggedIn === "function" &&
            window.AuthSession.isLoggedIn() &&
            window.BackendSupabase &&
            typeof window.BackendSupabase.client === "function" &&
            typeof window.BackendSupabase.isConfigured === "function" &&
            window.BackendSupabase.isConfigured()
          ) {
            var user =
              window.AuthSession.getUser &&
              window.AuthSession.getUser();
            var client2 = window.BackendSupabase.client();

            if (user && user.id && client2) {
              var meta = (user && user.user_metadata) || {};
              var pUsername = meta.username || null;

              if (!pUsername) {
                try {
                  var q = client2
                    .from("profiles")
                    .select("p_username")
                    .eq("id", user.id)
                    .limit(1);
                  var resp;
                  if (q && typeof q.maybeSingle === "function") {
                    resp = await q.maybeSingle();
                  } else if (q && typeof q.single === "function") {
                    resp = await q.single();
                  } else {
                    resp = await q;
                  }
                  if (
                    resp &&
                    !resp.error &&
                    resp.data &&
                    resp.data.p_username
                  ) {
                    pUsername = resp.data.p_username;
                  }
                } catch (eLookup) {
                  console.warn("[Prefs] lookup p_username error", eLookup);
                }
              }

              if (!pUsername) {
                if (user.email) {
                  pUsername =
                    String(user.email).split("@")[0] || null;
                }
                if (!pUsername) {
                  pUsername = "user_" + String(user.id).slice(0, 8);
                }
              }

              var lang = sqlLanguage(next.language);
              var pColor = sqlColorFromPrefs(next);
              var pFontType = sqlFontType(next.font);
              var pFontSize = sqlFontSize(next.fontSizePt);

              try {
                var payload = {
                  id: user.id,
                  email: user.email || null,
                  first_name:
                    (user.user_metadata &&
                      user.user_metadata.first_name) ||
                    null,
                  last_name:
                    (user.user_metadata &&
                      user.user_metadata.last_name) ||
                    null,
                  p_username: pUsername,
                  p_language: lang,
                  p_color: pColor,
                  p_font_type: pFontType,
                  p_font_size: pFontSize,
                  p_light: next.light === "on",
                };

                var up = await client2.from("profiles").upsert(payload);
                if (up && up.error) {
                  console.warn(
                    "[Prefs] profiles upsert error",
                    up.error
                  );
                }
              } catch (eUpsert) {
                console.warn(
                  "[Prefs] profiles upsert exception",
                  eUpsert
                );
              }
            }
          }
        } catch (e) {
          console.warn("[Prefs] sync user preferences error", e);
        }

        // 3) Recargar contenido en memoria para las nuevas preferencias
        let fakeTimer = null;
        try {
          var loaderMsg = getLang() === "en" ? "Loading" : "Cargando";
          var fakePct = 0;

          if (
            window.SystemLoader &&
            typeof window.SystemLoader.show === "function"
          ) {
            window.SystemLoader.show();
          }
          if (
            window.SystemLoader &&
            typeof window.SystemLoader.setProgress === "function"
          ) {
            window.SystemLoader.setProgress(0, loaderMsg);
          }

          if (
            window.SystemLoader &&
            typeof window.SystemLoader.setProgress === "function" &&
            typeof window.setInterval === "function"
          ) {
            fakeTimer = window.setInterval(function () {
              try {
                fakePct += 3;
                if (fakePct > 90) fakePct = 90;
                window.SystemLoader.setProgress(fakePct, loaderMsg);
                if (fakePct >= 90) {
                  window.clearInterval(fakeTimer);
                  fakeTimer = null;
                }
              } catch (eInt) {
                try {
                  window.clearInterval(fakeTimer);
                } catch (_) {}
                fakeTimer = null;
              }
            }, 500);
          }

          if (
            window.EntriesMemory &&
            typeof window.EntriesMemory.loadForPrefs === "function"
          ) {
            if (typeof window.EntriesMemory.resetCache === "function") {
              window.EntriesMemory.resetCache();
            }
            entriesCollectionsCache = {};
            entriesCorpusCache = {};
            clearNavigationState();
            await window.EntriesMemory.loadForPrefs(next, function (
              pct,
              text
            ) {
              try {
                var label = loaderMsg;
                var shownPct =
                  typeof pct === "number" ? pct : 0;
                if (
                  typeof fakePct === "number" &&
                  fakePct > shownPct
                ) {
                  shownPct = fakePct;
                }
                if (
                  window.SystemLoader &&
                  typeof window.SystemLoader.setProgress ===
                    "function"
                ) {
                  window.SystemLoader.setProgress(shownPct, label);
                }
              } catch (e) {}
            });
          }
          if (typeof preloadCollections === "function") {
            try {
              await preloadCollections();
            } catch (e) {
              console.warn(
                "[Prefs] preloadCollections after loadForPrefs error",
                e
              );
            }
          }
          applyToolbarDefaultsForPrefs(next);
        } catch (e) {
          console.warn(
            "[Prefs] error recargando entries en memoria",
            e
          );
        } finally {
          try {
            if (
              typeof window !== "undefined" &&
              window.clearInterval &&
              fakeTimer
            ) {
              window.clearInterval(fakeTimer);
            }
          } catch (_) {}
          if (
            window.SystemLoader &&
            typeof window.SystemLoader.hide === "function"
          ) {
            window.SystemLoader.hide();
          }
        }

        if (languageChanged) {
          try {
            showMessage(
              "success",
              w(
                "preferences.save",
                "Preferencias guardadas"
              )
            );
            if (
              typeof window.applyLanguageChange === "function"
            ) {
              await window.applyLanguageChange(
                next.language || getLang()
              );
              return;
            } else {
              window.location.reload();
              return;
            }
          } catch (e) {
            console.warn("Prefs languageChanged reload error", e);
            window.location.reload();
            return;
          }
        }

        // 4) ACTUALIZAR BREADCRUMB
        try {
          if (
            window.Toolbar &&
            typeof window.Toolbar.refreshBreadcrumb ===
              "function"
          ) {
            window.Toolbar.refreshBreadcrumb();
          }
        } catch (e) {
          console.warn(
            "[Prefs] error al refrescar breadcrumb",
            e
          );
        }

        try {
          if (
            window.HeaderMessages &&
            typeof window.HeaderMessages.show === "function"
          ) {
            window.HeaderMessages.show(
              w(
                "preferences.save",
                "Preferencias guardadas"
              ),
              { type: "success", duration: 5000 }
            );
          }
        } catch (eMsg) {}

        if (window.Main && typeof window.Main.showView === "function") {
          window.Main.showView("navigator");
        }
      });
    }

    // Aplicar prefs actuales (fuentes, color, luz, etc.)
    applyFromPrefs();

    if (typeof updateSaveButtonState === "function") {
      updateSaveButtonState();
    }

    // Inicializar combos de Collections / Corpus
    if (collectionEl) {
      initEntriesCombos();
    }
  }

  // Pre-carga opcional de colecciones al arrancar la app
  async function preloadCollections() {
    try {
      var langCode =
        (typeof entriesLang !== "undefined" && entriesLang) ||
        getLang() ||
        "es";

      try {
        if (
          window.EntriesMemory &&
          typeof window.EntriesMemory.preloadMetaForLang === "function"
        ) {
          await window.EntriesMemory.preloadMetaForLang(langCode);
        }
      } catch (eMeta) {
        console.warn("[Prefs] preloadCollections meta error", eMeta);
      }

      var prefsLocal = null;
      try {
        if (
          window.PrefsStore &&
          typeof window.PrefsStore.load === "function"
        ) {
          prefsLocal = window.PrefsStore.load() || {};
        }
      } catch (ePrefs) {
        prefsLocal = null;
      }

      if (typeof loadCollections === "function") {
        var collections = await loadCollections(langCode);
        var col =
          (prefsLocal && prefsLocal.collection) ||
          (collections && collections.length ? collections[0] : null);
        if (col && typeof loadCorpusForCollection === "function") {
          await loadCorpusForCollection(
            langCode,
            col,
            prefsLocal && prefsLocal.corpus
          );
        }
      }
    } catch (e) {
      console.warn("[Prefs] preloadCollections error", e);
    }
  }

  return { render: render, preloadCollections: preloadCollections };
})();
