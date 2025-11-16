// main.preferences.js – vista de preferencias de usuario
window.MainPreferences = (function () {
  function getLang() {
    try {
      const store = window.PrefsStore;
      if (store && typeof store.load === 'function') {
        const prefs = store.load();
        if (prefs && prefs.language) return prefs.language;
      }
    } catch (e) {}
    return 'es';
  }

  const TEXTS = {
    es: {
      collection: 'Colección',
      corpus: 'Corpus',
      fontType: 'Tipo de fuente',
      fontSize: 'Tamaño de fuente',
      light: 'Luz',
      language: 'Idioma',
      color: 'Color',
      reset: 'Reestablecer',
      cancel: 'Cancelar',
      save: 'Guardar',
      preview: 'Prueba de texto para ver tipo y tamaño de fuente',
    },
    en: {
      collection: 'Collection',
      corpus: 'Corpus',
      fontType: 'Font Type',
      fontSize: 'Font Size',
      light: 'Light',
      language: 'Language',
      color: 'Color',
      reset: 'Reset',
      cancel: 'Cancel',
      save: 'Save',
      preview: 'Sample text to preview font family and size',
    },
  };

  function applyTexts(root) {
    const lang = getLang();
    const t = TEXTS[lang] || TEXTS.es;

    const lblCollection = root.querySelector('label[for="pref-collection"]');
    const lblCorpus = root.querySelector('label[for="pref-corpus"]');
    const lblFontType = root.querySelector('label[for="pref-font-family"]');
    const lblFontSize = root.querySelector('label[for="pref-font-size"]');
    const lblLight = root.querySelector('label[for="pref-light"]');
    const lblLang = root.querySelector('label[for="pref-lang"]');
    const lblColor = root.querySelector('label[for="pref-color"]');

    if (lblCollection) lblCollection.textContent = t.collection;
    if (lblCorpus) lblCorpus.textContent = t.corpus;
    if (lblFontType) lblFontType.textContent = t.fontType;
    if (lblFontSize) lblFontSize.textContent = t.fontSize;
    if (lblLight) lblLight.textContent = t.light;
    if (lblLang) lblLang.textContent = t.language;
    if (lblColor) lblColor.textContent = t.color;

    const btnReset = root.querySelector('#pref-reset');
    const btnCancel = root.querySelector('#pref-cancel');
    const btnSave = root.querySelector('#pref-save');
    if (btnReset) btnReset.textContent = t.reset;
    if (btnCancel) btnCancel.textContent = t.cancel;
    if (btnSave) btnSave.textContent = t.save;

    const prev = root.querySelector('#prefs-preview-text');
    if (prev) prev.textContent = t.preview;
  }

  // ======== Descubrir fuentes desde @font-face en CSS ========
  let cachedFontFamilies = null;

  function cleanFontName(name) {
    if (!name) return '';
    return name.trim().replace(/^['"]+|['"]+$/g, '');
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
        // CSS externo o bloqueado por CORS → lo saltamos
        return;
      }
      if (!rules) return;

      Array.from(rules).forEach((rule) => {
        const isFontFace =
          (window.CSSRule && rule.type === CSSRule.FONT_FACE_RULE) ||
          (rule.constructor && rule.constructor.name === 'CSSFontFaceRule') ||
          (rule.cssText && /^@font-face/i.test(rule.cssText));

        if (!isFontFace) return;

        const famRaw =
          (rule.style &&
            (rule.style.getPropertyValue('font-family') || rule.style.fontFamily)) ||
          '';
        const fam = cleanFontName(famRaw);
        if (fam) famSet.add(fam);
      });
    });

    let list = Array.from(famSet);

    if (!list.length) {
      list = ['System'];
    } else {
      list.sort();
      if (!list.includes('System')) list.unshift('System');
    }

    cachedFontFamilies = list;
    return cachedFontFamilies;
  }

  function fillFonts(selectEl, fontsList, current) {
    if (!selectEl) return;
    selectEl.innerHTML = '';

    const list = fontsList && fontsList.length ? fontsList.slice() : ['System'];
    if (!list.includes('System')) list.unshift('System');

    list.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      if (current && current === f) opt.selected = true;
      selectEl.appendChild(opt);
    });

    if (!selectEl.value && list.length) {
      selectEl.value = list[0];
    }
  }

  // ======== Render ========

  function render(container) {
    if (!container) return;

    container.innerHTML = '';

    var panel = document.createElement('div');
    panel.className = 'prefs-panel panel-single';

    panel.innerHTML = [
      '<div class="prefs-body">',
      '  <div class="prefs-row">',
      '    <div class="prefs-field">',
      '      <label for="pref-collection">Colección</label>',
      '      <select id="pref-collection">',
      '        <option value="">(default)</option>',
      '      </select>',
      '    </div>',
      '    <div class="prefs-field">',
      '      <label for="pref-corpus">Corpus</label>',
      '      <select id="pref-corpus">',
      '        <option value="">(default)</option>',
      '      </select>',
      '    </div>',
      '  </div>',
      '',
      '  <div class="prefs-row prefs-row-font">',
      '    <div class="prefs-field">',
      '      <label for="pref-font-family">Tipo de fuente</label>',
      '      <select id="pref-font-family"></select>',
      '    </div>',
      '    <div class="prefs-field prefs-field-font-size">',
      '      <label for="pref-font-size">Tamaño de fuente</label>',
      '      <div class="prefs-font-size-row">',
      '        <input type="range" id="pref-font-size" min="10" max="20" step="1" />',
      '        <span id="pref-font-size-val">12</span>',
      '      </div>',
      '    </div>',
      '  </div>',
      '',
      '  <div class="prefs-row prefs-row-top">',
      '    <div class="prefs-field prefs-field-light">',
      '      <label for="pref-light">Luz</label>',
      '      <label class="prefs-switch">',
      '        <input type="checkbox" id="pref-light" />',
      '        <span class="prefs-switch-track">',
      '          <span class="prefs-switch-thumb"></span>',
      '        </span>',
      '        <span class="prefs-switch-text" id="pref-light-text">On</span>',
      '      </label>',
      '    </div>',
      '    <div class="prefs-field">',
      '      <label for="pref-lang">Idioma</label>',
      '      <select id="pref-lang">',
      '        <option value="es">Español</option>',
      '        <option value="en">English</option>',
      '      </select>',
      '    </div>',
      '    <div class="prefs-field">',
      '      <label for="pref-color">Color</label>',
      '      <div class="prefs-color">',
      '        <input type="color" id="pref-color" />',
      '        <input type="text" id="pref-color-hex" maxlength="7" />',
      '      </div>',
      '    </div>',
      '  </div>',
      '',
      '  <div class="prefs-preview-wrap">',
      '    <div class="prefs-preview" id="prefs-preview-text">',
      '      Prueba de texto para ver tipo y tamaño de fuente',
      '    </div>',
      '  </div>',
      '',
      '  <div class="prefs-foot">',
      '    <button type="button" class="chip" id="pref-reset">Reset</button>',
      '    <button type="button" class="chip" id="pref-cancel">Cancelar</button>',
      '    <button type="button" class="chip" id="pref-save">Guardar</button>',
      '  </div>',
      '</div>',
    ].join('\n');

    container.appendChild(panel);

    wireLogic(panel);
    applyTexts(panel);
  }

  function wireLogic(root) {
    var PrefsStore = window.PrefsStore;

    var prefs =
      (PrefsStore && PrefsStore.load && PrefsStore.load()) ||
      (PrefsStore && PrefsStore.DEFAULTS) ||
      {};

    var collectionEl = root.querySelector('#pref-collection');
    var corpusEl = root.querySelector('#pref-corpus');
    var fontFamilyEl = root.querySelector('#pref-font-family');
    var fontSizeEl = root.querySelector('#pref-font-size');
    var fontSizeValEl = root.querySelector('#pref-font-size-val');
    var lightEl = root.querySelector('#pref-light');
    var lightTextEl = root.querySelector('#pref-light-text');
    var langEl = root.querySelector('#pref-lang');
    var colorEl = root.querySelector('#pref-color');
    var colorHexEl = root.querySelector('#pref-color-hex');
    var resetBtn = root.querySelector('#pref-reset');
    var cancelBtn = root.querySelector('#pref-cancel');
    var saveBtn = root.querySelector('#pref-save');
    var previewEl = root.querySelector('#prefs-preview-text');

    var fontsList = getFontFamiliesFromCSS();

    function applyLightToMain(checked) {
      var main = document.getElementById('app-main');
      if (!main) return;
      if (checked) {
        main.removeAttribute('data-light');
      } else {
        main.setAttribute('data-light', 'off');
      }
    }

    function updateLightText() {
      if (!lightEl || !lightTextEl) return;
      lightTextEl.textContent = lightEl.checked ? 'On' : 'Off';
      applyLightToMain(lightEl.checked);
    }

    function updatePreviewStyle() {
      if (!previewEl) return;

      var fontVal = fontFamilyEl ? fontFamilyEl.value : 'System';
      var sizeVal = fontSizeEl ? Number(fontSizeEl.value) || 12 : 12;
      var colorVal = colorEl ? colorEl.value || '#000000' : '#000000';

      var famValue =
        fontVal && fontVal !== 'System'
          ? "'" + fontVal + "', var(--app-font-fallback)"
          : 'var(--app-font-fallback)';

      previewEl.style.fontFamily = famValue;
      previewEl.style.fontSize = sizeVal + 'pt';
      previewEl.style.color = colorVal;
    }

    function applyFromPrefs() {
      if (!prefs) return;

      if (collectionEl) collectionEl.value = prefs.collection || '';
      if (corpusEl) corpusEl.value = prefs.corpus || '';

      var currentFont = prefs.font || 'System';
      fillFonts(fontFamilyEl, fontsList, currentFont);

      if (fontSizeEl) fontSizeEl.value = prefs.fontSizePt || 12;
      if (fontSizeEl && fontSizeValEl) fontSizeValEl.textContent = fontSizeEl.value;

      if (langEl) langEl.value = prefs.language || 'es';
      if (lightEl) lightEl.checked = prefs.light !== 'off';
      if (colorEl) colorEl.value = prefs.colorHex || '#000000';
      if (colorHexEl) colorHexEl.value = prefs.colorHex || '#000000';

      updateLightText();
      applyTexts(root);
      updatePreviewStyle();
    }

    if (fontSizeEl && fontSizeValEl) {
      fontSizeEl.addEventListener('input', function () {
        fontSizeValEl.textContent = fontSizeEl.value;
        updatePreviewStyle();
      });
    }

    if (fontFamilyEl) {
      fontFamilyEl.addEventListener('change', function () {
        updatePreviewStyle();
      });
    }

    if (colorEl) {
      colorEl.addEventListener('input', function () {
        if (colorHexEl) colorHexEl.value = colorEl.value;
        updatePreviewStyle();
      });
    }

    if (colorHexEl) {
      colorHexEl.addEventListener('change', function () {
        var v = colorHexEl.value.trim();
        if (!v) return;
        if (!v.startsWith('#')) v = '#' + v;
        if (v.length === 7) {
          colorHexEl.value = v;
          if (colorEl) colorEl.value = v;
          updatePreviewStyle();
        }
      });
    }

    if (lightEl) {
      lightEl.addEventListener('change', function () {
        updateLightText();
      });
    }

    if (resetBtn && PrefsStore) {
      resetBtn.addEventListener('click', function () {
        prefs = Object.assign({}, PrefsStore.DEFAULTS);
        try {
          PrefsStore.save(prefs);
          PrefsStore.apply(prefs);
        } catch (e) {
          console.warn('Prefs reset error', e);
        }
        applyFromPrefs();
      });
    }

    if (cancelBtn && PrefsStore) {
      cancelBtn.addEventListener('click', function () {
        prefs = PrefsStore.load();
        PrefsStore.apply(prefs);
        if (window.Main && typeof window.Main.showView === 'function') {
          window.Main.showView('navigator');
        }
      });
    }

    if (saveBtn && PrefsStore) {
      saveBtn.addEventListener('click', function () {
        var current =
          (PrefsStore && PrefsStore.load && PrefsStore.load()) ||
          PrefsStore.DEFAULTS ||
          {};
        var selectedFont = fontFamilyEl ? fontFamilyEl.value || 'System' : 'System';

        var next = Object.assign({}, current, {
          collection: collectionEl ? collectionEl.value || null : current.collection,
          corpus: corpusEl ? corpusEl.value || null : current.corpus,
          font: selectedFont === 'System' ? null : selectedFont,
          fontSizePt: fontSizeEl
            ? Number(fontSizeEl.value) || current.fontSizePt
            : current.fontSizePt,
          language: langEl ? langEl.value || current.language : current.language,
          light: lightEl ? (lightEl.checked ? 'on' : 'off') : current.light,
          colorHex: colorEl ? colorEl.value || current.colorHex : current.colorHex,
        });

        try {
          var saved = PrefsStore.save(next);
          PrefsStore.apply(saved);
          prefs = saved;
        } catch (e) {
          console.warn('Prefs save error', e);
        }

        if (window.Main && typeof window.Main.showView === 'function') {
          window.Main.showView('navigator');
        }
      });
    }

    applyFromPrefs();
  }

  return { render: render };
})();
