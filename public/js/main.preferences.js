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

  // =========================================================
  // Entries (Collections / Corpus) – helpers y caches
  // =========================================================
  var entriesCollectionsCache = {};     // por idioma: { es: [..], en: [..] }
  var entriesCorpusCache = {};         // por idioma+collection: { "es::Genesis": [..] }


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

  function t(key) {
    const lang = getLang();
    const dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || key;
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

  function render(container) {
    if (!container) return;
    container.innerHTML = "";

    const panel = document.createElement("div");
    panel.className = "panel-single prefs-panel";

    panel.innerHTML = [
      '<h1 data-i18n="prefs.title" class="main-view-title">Preferencias</h1>',
      "",
      '<div class="prefs-grid">',
      '  <div class="prefs-fields">',
      '    <div class="prefs-field">',
      '      <label for="pref-lang">Idioma</label>',
      '      <select id="pref-lang">',
      '        <option value="es">Español</option>',
      '        <option value="en">English</option>',
      "      </select>",
      "    </div>",
      '    <div class="prefs-field">',
      '      <label for="pref-collection">Colección</label>',
      '      <select id="pref-collection">',
      '        <option value="">(auto)</option>',
      "      </select>",
      "    </div>",
      '    <div class="prefs-field">',
      '      <label for="pref-corpus">Corpus</label>',
      '      <select id="pref-corpus">',
      '        <option value="">(auto)</option>',
      "      </select>",
      "    </div>",
      '    <div class="prefs-field">',
      '      <label for="pref-font-family">Tipo de letra</label>',
      '      <select id="pref-font-family"></select>',
      "    </div>",
      '    <div class="prefs-field">',
      '      <label for="pref-font-size">Tamaño</label>',
      '      <div class="prefs-font-size">',
      '        <input type="range" id="pref-font-size" min="8" max="25" />',
      '        <span id="pref-font-size-val"></span>',
      "      </div>",
      "    </div>",
      '    <div class="prefs-field">',
      '      <label for="pref-color">Color</label>',
      '      <div class="prefs-color">',
      '        <input type="color" id="pref-color" />',
      '        <input type="text" id="pref-color-hex" maxlength="7" />',
      "      </div>",
      "    </div>",
      '    <div class="prefs-field">',
      '      <label for="pref-preview">Vista previa del texto…</label>',
      '      <div id="pref-preview" class="prefs-preview">',
      "        Vista previa del texto…",
      "      </div>",
      "    </div>",
      '    <div class="prefs-field prefs-light-row">',
      '      <label for="pref-light">Luz</label>',
      '      <div class="prefs-light">',
      '        <input type="checkbox" id="pref-light" />',
      '        <span id="pref-light-text"></span>',
      "      </div>",
      "    </div>",
      "  </div>",
      "</div>",
      "",
      '<div class="prefs-actions">',
      '  <button type="button" class="chip" id="pref-reset">Restablecer</button>',
      '  <button type="button" class="chip ghost" id="pref-cancel">Cancelar</button>',
      '  <button type="button" class="chip primary" id="pref-save">Guardar</button>',
      "</div>",
    ].join("\n");

    container.appendChild(panel);

    wireLogic(panel);
    applyTexts(panel);
  }

  function applyTexts(root) {
    const titleEl = root.querySelector("h1");
    if (titleEl) titleEl.textContent = "Preferencias";

    const lblCollection = root.querySelector('label[for="pref-collection"]');
    const lblCorpus = root.querySelector('label[for="pref-corpus"]');
    const lblFont = root.querySelector('label[for="pref-font-family"]');
    const lblSize = root.querySelector('label[for="pref-font-size"]');
    const lblLang = root.querySelector('label[for="pref-lang"]');
    const lblColor = root.querySelector('label[for="pref-color"]');
    const lblLight = root.querySelector('label[for="pref-light"]');

    if (lblCollection) lblCollection.textContent = t("collection");
    if (lblCorpus) lblCorpus.textContent = t("corpus");
    if (lblFont) lblFont.textContent = t("fontFamily");
    if (lblSize) lblSize.textContent = t("fontSize");
    if (lblLang) lblLang.textContent = t("language");
    if (lblColor) lblColor.textContent = t("color");
    if (lblLight) lblLight.textContent = t("light");

    const btnReset = root.querySelector("#pref-reset");
    const btnCancel = root.querySelector("#pref-cancel");
    const btnSave = root.querySelector("#pref-save");
    if (btnReset) btnReset.textContent = t("reset");
    if (btnCancel) btnCancel.textContent = t("cancel");
    if (btnSave) btnSave.textContent = t("save");

    const prev = root.querySelector("#prefs-preview-text");
    if (prev) prev.textContent = t("preview");
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
    var fontFamilyEl = root.querySelector("#pref-font-family");
    var fontSizeEl = root.querySelector("#pref-font-size");
    var fontSizeValEl = root.querySelector("#pref-font-size-val");
    var lightEl = root.querySelector("#pref-light");
    var lightTextEl = root.querySelector("#pref-light-text");
    var langEl = root.querySelector("#pref-lang");
    var colorEl = root.querySelector("#pref-color");
    var colorHexEl = root.querySelector("#pref-color-hex");
    var resetBtn = root.querySelector("#pref-reset");
    var cancelBtn = root.querySelector("#pref-cancel");
    var saveBtn = root.querySelector("#pref-save");
    var previewEl = root.querySelector("#prefs-preview-text");

    function updateSaveButtonState() {
      if (!saveBtn) return;

      var hasCollection =
        collectionEl && collectionEl.value && collectionEl.value.trim() !== "";
      var hasCorpus =
        corpusEl && corpusEl.value && corpusEl.value.trim() !== "";

      // true solo cuando los dos tienen valor
      saveBtn.disabled = !(hasCollection && hasCorpus);
    }

    var fontsList = getFontFamiliesFromCSS();
    var client = getSupabaseClient();
    var entriesLang = prefs.language || getLang();

    function applyLightToMain(checked) {
      var main = document.getElementById("app-main");
      if (!main) return;
      if (checked) {
        main.removeAttribute("data-light");
      } else {
        main.setAttribute("data-light", "off");
      }
    }

    function updateLightText() {
      if (!lightEl || !lightTextEl) return;
      lightTextEl.textContent = lightEl.checked ? "On" : "Off";
      applyLightToMain(lightEl.checked);
    }

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

      var color = prefs.colorHex || "#000000";
      if (colorEl) colorEl.value = color;
      if (colorHexEl) colorHexEl.value = color;

      if (lightEl) {
        lightEl.checked = prefs.light !== "off";
      }
      updateLightText();
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
          if (window.EntriesMemory && typeof window.EntriesMemory.preloadMetaForLang === "function") {
            await window.EntriesMemory.preloadMetaForLang(newLang);
          }
        } catch (eMetaChange) {
          console.warn("[Prefs] preloadMetaForLang on language change error", eMetaChange);
        }

        if (client && typeof initEntriesCombos === "function") {
          try {
            await initEntriesCombos();
          } catch (eInit) {
            console.warn("[Prefs] initEntriesCombos error after language change", eInit);
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
        kind === "collection"
          ? "Cargando Collections"
          : "Cargando Corpus";
      var baseEn =
        kind === "collection"
          ? "Loading Collections"
          : "Loading Corpus";

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

    // Carga todas las level_1 distintas para un idioma, usando cache

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
      if (!window.EntriesMemory || typeof window.EntriesMemory.getRows !== "function") {
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


    async function loadCorpusForCollection(langCode, collectionValue, selectedCorpus) {
      var cacheKey = (langCode || "default") + "::" + (collectionValue || "");
      var values = entriesCorpusCache[cacheKey] || null;

      if (!values) {
        // 1) Intentar primero con la meta ya precargada
        try {
          if (
            window.EntriesMemory &&
            typeof window.EntriesMemory.getCorpusForLangCollection === "function"
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
          if (window.PrefsStore && typeof window.PrefsStore.save === "function") {
            window.PrefsStore.save(prefs);
          }
        } catch (e) {
          console.warn("[Prefs] save prefs.corpus error", e);
        }
      }

      if (typeof updateSaveButtonState === "function") {
        updateSaveButtonState();
      }

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
        return;
      }

      var selectedCollection = null;

      if (prefs && prefs.collection && collections.indexOf(prefs.collection) >= 0) {
        selectedCollection = prefs.collection;
      } else {
        selectedCollection = collections[0];
      }

      fillCollectionsSelect(collections, selectedCollection);

      if (!prefs.collection || prefs.collection !== selectedCollection) {
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

      if (typeof updateSaveButtonState === "function") {
        updateSaveButtonState();
      }
    }


    if (collectionEl) {
      collectionEl.addEventListener("change", function () {
        var newCollection = collectionEl.value || "";
        prefs.collection = newCollection || null;
        if (!newCollection) {
          if (corpusEl) corpusEl.innerHTML = "";
          if (typeof updateSaveButtonState === "function") {
            updateSaveButtonState();
          }
          return;
        }
        loadCorpusForCollection(entriesLang, newCollection, null);
        if (typeof updateSaveButtonState === "function") {
          updateSaveButtonState();
        }
      });
    }

    if (corpusEl) {
      corpusEl.addEventListener("change", function () {
        var newCorpus = corpusEl.value || "";
        prefs.corpus = newCorpus || null;
        if (window.PrefsStore && typeof window.PrefsStore.save === "function") {
          try {
            window.PrefsStore.save(prefs);
          } catch (e) {
            console.warn("[Prefs] save prefs.corpus (change) error", e);
          }
        }
        if (typeof updateSaveButtonState === "function") {
          updateSaveButtonState();
        }
      });
    }

    // ====== Listeners de fuentes / color / luz ======
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

    if (lightEl) {
      lightEl.addEventListener("change", function () {
        updateLightText();
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
    if (saveBtn && PrefsStore) {
      saveBtn.addEventListener("click", async function () {
        var current =
          (PrefsStore && PrefsStore.load && PrefsStore.load()) ||
          PrefsStore.DEFAULTS ||
          {};
        var selectedFont = fontFamilyEl
          ? fontFamilyEl.value || "System"
          : "System";
        var previousLanguage = current.language || getLang();

        var next = Object.assign({}, current, {
          collection: collectionEl
            ? collectionEl.value || null
            : current.collection,
          corpus: corpusEl ? corpusEl.value || null : current.corpus,
          font: selectedFont === "System" ? null : selectedFont,
          fontSizePt: fontSizeEl
            ? Number(fontSizeEl.value) || current.fontSizePt
            : current.fontSizePt,
          language: langEl ? langEl.value || current.language : current.language,
          light: lightEl ? (lightEl.checked ? "on" : "off") : current.light,
          colorHex: colorEl ? colorEl.value || current.colorHex : current.colorHex,
        });

        var languageChanged = (next.language || getLang()) !== (previousLanguage || getLang());

        // 1) Guardar localmente y aplicar al sitio
        try {
          var saved = PrefsStore.save(next);
          PrefsStore.apply(saved);
          prefs = saved;
        } catch (e) {
          console.warn("Prefs save error", e);
        }

        // Notificar al resto de la app (footer, toolbar, etc.) que se aplicaron nuevas preferencias
        try {
          if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
            window.dispatchEvent(new CustomEvent("prefs:applied", { detail: saved || next }));
          }
        } catch (e) {
          console.warn("[Prefs] dispatch prefs:applied error", e);
        }

        // Recargar en segundo plano la base (entries) solo para el idioma/colección/corpus elegido
        try {
          if (window.EntriesMemory && typeof window.EntriesMemory.loadForPrefs === "function") {
            window.EntriesMemory.loadForPrefs(saved || next);
          }
        } catch (e) {
          console.warn("[Prefs] reload entries for new prefs error", e);
        }

        // 2) Si hay usuario logueado, guardar TAMBIÉN en profiles (SQL)
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
            var user = window.AuthSession.getUser
              ? window.AuthSession.getUser()
              : null;
            var client2 = window.BackendSupabase.client();

            if (user && user.id && client2) {
              var lang = sqlLanguage(next.language);
              var pColor = sqlColorFromPrefs(next);
              var pFontType = sqlFontType(next.font);
              var pFontSize = sqlFontSize(next.fontSizePt);

              var payload = {
                id: user.id,
                email: user.email || null,
                first_name:
                  (user.user_metadata && user.user_metadata.first_name) || null,
                last_name:
                  (user.user_metadata && user.user_metadata.last_name) || null,

                p_language: lang,
                p_color: pColor,
                p_font_type: pFontType,
                p_font_size: pFontSize,
                p_light: next.light === "on",
                p_level_1: next.collection || null,
                p_level_2: next.corpus || null,
              };

              var up = await client2.from("profiles").upsert(payload);
              if (up && up.error) {
                console.warn("[Prefs] profiles upsert error", up.error);
              }
            }
          }
        } catch (e) {
          console.warn("[Prefs] sync user preferences error", e);
        }

        // 3) Recargar contenido en memoria para las nuevas preferencias
        try {
          if (window.SystemLoader && typeof window.SystemLoader.show === "function") {
            window.SystemLoader.show();
          }
          if (window.SystemLoader && typeof window.SystemLoader.setProgress === "function") {
            var msg = (next.language === "en" ? "Loading content…" : "Cargando contenido…");
            window.SystemLoader.setProgress(0, msg);
          }
          if (window.EntriesMemory && typeof window.EntriesMemory.loadForPrefs === "function") {
            await window.EntriesMemory.loadForPrefs(next, function (pct, text) {
              try {
                if (window.SystemLoader && typeof window.SystemLoader.setProgress === "function") {
                  var msg2 = text || (next.language === "en" ? "Loading content…" : "Cargando contenido…");
                  window.SystemLoader.setProgress(pct, msg2);
                }
              } catch (e) {}
            });
          }
          if (typeof preloadCollections === "function") {
            try {
              await preloadCollections();
            } catch (e) {
              console.warn("[Prefs] preloadCollections after loadForPrefs error", e);
            }
          }
        } catch (e) {
          console.warn("[Prefs] error recargando entries en memoria", e);
        } finally {
          if (window.SystemLoader && typeof window.SystemLoader.hide === "function") {
            window.SystemLoader.hide();
          }
        }

        if (languageChanged) {
          try {
            window.location.reload();
            return;
          } catch (e) {
            console.warn("Prefs languageChanged reload error", e);
          }
        }

        // 4) ACTUALIZAR BREADCRUMB con los nuevos Collection / Corpus
        try {
          if (
            window.Toolbar &&
            typeof window.Toolbar.refreshBreadcrumb === "function"
          ) {
            window.Toolbar.refreshBreadcrumb();
          }
        } catch (e) {
          console.warn("[Prefs] error al refrescar breadcrumb", e);
        }

        // 4) Volver a la vista principal
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

    // Inicializar combos de Collections / Corpus desde entries (solo primera vez por idioma)
    if (collectionEl) {
      initEntriesCombos();
    }
  }

  

  // Pre-carga opcional de colecciones al arrancar la app
  // (solo calienta la cache; no modifica el DOM).
  async function preloadCollections() {
    try {
      var langCode =
        (typeof entriesLang !== "undefined" && entriesLang) ||
        getLang() ||
        "es";

      // 1) Pre-cargar meta completa de entries para este idioma (solo una vez)
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

      // 2) Usar preferencias locales para elegir colección/corpus inicial
      var prefsLocal = null;
      try {
        if (window.PrefsStore && typeof window.PrefsStore.load === "function") {
          prefsLocal = window.PrefsStore.load() || {};
        }
      } catch (ePrefs) {
        prefsLocal = null;
      }

      // 3) Calentar cache de colecciones y corpus en memoria (no toca el DOM)
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