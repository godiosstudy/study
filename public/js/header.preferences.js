// public/js/header.preferences.js
;(function () {
  // ---------- Datos fijos de colección / corpus ----------
  const CONTENT = {
    Biblia: ['AT', 'NT'],
    Corán: ['Libro'],
    Talmud: ['Mishná', 'Guemará'],
  };

  // ---------- Descubrir fuentes desde @font-face en CSS ----------
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

        if (!famRaw) return;

        famRaw.split(',').forEach((part) => {
          const clean = cleanFontName(part);
          if (clean) famSet.add(clean);
        });
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

  // ---------- i18n helpers ----------
  function getPrefsLang(prefs) {
    if (prefs && prefs.language) return prefs.language;
    const store = window.PrefsStore;
    return (store && store.DEFAULTS && store.DEFAULTS.language) || 'es';
  }

  function getTR(lang) {
    const base = window.I18n && window.I18n.__TR;
    return base ? base[lang] : null;
  }

  function getPrefsSection(lang) {
    const tr = getTR(lang);
    return tr && tr.prefs ? tr.prefs : null;
  }

  function updateLightText(controls, lang, isOn) {
    if (!controls.lightText) return;
    const P = getPrefsSection(lang);
    let txt = isOn ? 'On' : 'Off';
    if (P && P.light) {
      txt = isOn ? P.light.on || txt : P.light.off || txt;
    }
    controls.lightText.textContent = txt;
  }

  function applyTranslations(controls, lang) {
    const P = getPrefsSection(lang);
    if (!P || !controls.root) {
      updateLightText(controls, lang, controls.light && controls.light.checked);
      return;
    }
    const labels = P.labels || {};

    const map = [
      ['label[for="pref-language"]', labels.language],
      ['label[for="pref-color"]', labels.colorAccent],
      ['label[for="pref-light"]', labels.light],
      ['label[for="pref-collection"]', labels.collection],
      ['label[for="pref-corpus"]', labels.corpus],
      ['label[for="pref-font"]', labels.fontType],
      ['label[for="pref-font-size"]', labels.fontSize],
    ];
    map.forEach(([sel, txt]) => {
      const el = controls.root.querySelector(sel);
      if (el && txt) el.textContent = txt;
    });

    const actions = P.actions || {};
    if (controls.btnCancel && actions.cancel) controls.btnCancel.textContent = actions.cancel;
    if (controls.btnSave && actions.save) controls.btnSave.textContent = actions.save;

    updateLightText(controls, lang, controls.light && controls.light.checked);
  }

  // ---------- helpers de UI ----------
  function fillCollections(selectEl, current) {
    selectEl.innerHTML = '';
    const keys = Object.keys(CONTENT);
    keys.forEach((k, idx) => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = k;
      if ((current && current === k) || (!current && idx === 0)) opt.selected = true;
      selectEl.appendChild(opt);
    });
    return selectEl.value;
  }

  function fillCorpus(selectEl, collection, current) {
    selectEl.innerHTML = '';
    const list = CONTENT[collection] || [];
    list.forEach((c, idx) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if ((current && current === c) || (!current && idx === 0)) opt.selected = true;
      selectEl.appendChild(opt);
    });
    return selectEl.value;
  }

  function fillFonts(selectEl, fontsList, current) {
    selectEl.innerHTML = '';
    const list = fontsList.length ? fontsList : ['System'];
    list.forEach((f, idx) => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      if ((current && current === f) || (!current && idx === 0)) opt.selected = true;
      selectEl.appendChild(opt);
    });
    return selectEl.value;
  }

  function buildPrefsFromUI(controls) {
    const store = window.PrefsStore;
    const base =
      (store && store.load && store.load()) || (store && store.DEFAULTS) || {};
    const prefs = { ...base };
    if (controls.language) prefs.language = controls.language.value || prefs.language;
    if (controls.collection) prefs.collection = controls.collection.value || prefs.collection;
    if (controls.corpus) prefs.corpus = controls.corpus.value || prefs.corpus;
    if (controls.font) prefs.font = controls.font.value || prefs.font;
    if (controls.fontSize)
      prefs.fontSizePt =
        parseInt(controls.fontSize.value, 10) || prefs.fontSizePt || 12;
    if (controls.color)
      prefs.colorHex = controls.color.value || prefs.colorHex || '#000000';
    if (controls.light) prefs.light = controls.light.checked ? 'on' : 'off';
    return prefs;
  }

  function fillFromPrefs(controls, prefs) {
    const lang = getPrefsLang(prefs);

    // Idioma con banderitas
    if (
      controls.language &&
      window.LanguagePrefs &&
      window.LanguagePrefs.mountLanguageSelect
    ) {
      window.LanguagePrefs.mountLanguageSelect(controls.language, lang);
    } else if (controls.language) {
      controls.language.value = lang;
    }

    const col = fillCollections(controls.collection, prefs.collection || null);
    fillCorpus(controls.corpus, col, prefs.corpus || null);

    const fonts = getFontFamiliesFromCSS();
    fillFonts(controls.font, fonts, prefs.font || null);

    const size = prefs.fontSizePt || 12;
    controls.fontSize.value = String(size);
    controls.fontSizeVal.textContent = size + 'pt';

    const color = prefs.colorHex || '#000000';
    controls.color.value = color;
    controls.colorHex.value = color.toUpperCase();

    const isLightOn = (prefs.light || 'on') !== 'off';
    controls.light.checked = isLightOn;

    applyTranslations(controls, lang);
  }

  // ---------- Render de la pantalla de preferencias ----------
  function renderPreferencesScreen() {
    const store = window.PrefsStore;
    if (!window.AppMain || typeof window.AppMain.renderScreen !== 'function') {
      console.warn('[Prefs] AppMain.renderScreen no está disponible');
      return;
    }

    const current =
      (store && store.load && store.load()) || (store && store.DEFAULTS) || {};

    // Solapa de título fija (Preferencias / Preferences)
    const lang = getPrefsLang(current);
    const P = getPrefsSection(lang);
    const viewLabel =
      (P && P.title) || (lang === 'es' ? 'Preferencias' : 'Preferences');
    if (window.AppMain && typeof window.AppMain.setViewTitle === 'function') {
      window.AppMain.setViewTitle(viewLabel);
    }

    window.AppMain.renderScreen(function (root) {
      root.innerHTML = `
        <section class="panel panel-single prefs-panel">
          <div class="prefs-body">
            <div class="prefs-row prefs-row-top">
              <div class="prefs-field">
                <label for="pref-language">Idioma</label>
                <select id="pref-language"></select>
              </div>
              <div class="prefs-field">
                <label for="pref-color">Color (acento)</label>
                <div class="prefs-color">
                  <input id="pref-color" type="color" value="#000000">
                  <input id="pref-color-hex" type="text" value="#000000" maxlength="7" pattern="^#([A-Fa-f0-9]{6})$">
                </div>
              </div>
              <div class="prefs-field">
                <label for="pref-light">Luz</label>
                <label class="prefs-switch">
                  <input id="pref-light" type="checkbox" checked>
                  <span class="prefs-switch-track">
                    <span class="prefs-switch-thumb"></span>
                  </span>
                  <span id="pref-light-text" class="prefs-switch-text">On</span>
                </label>
              </div>
            </div>
            <div class="prefs-field">
              <label for="pref-collection">Colección</label>
              <select id="pref-collection"></select>
            </div>
            <div class="prefs-field">
              <label for="pref-corpus">Corpus</label>
              <select id="pref-corpus"></select>
            </div>
            <div class="prefs-row prefs-row-font">
              <div class="prefs-field">
                <label for="pref-font">Tipo de Fuente</label>
                <select id="pref-font"></select>
              </div>
              <div class="prefs-field prefs-field-font-size">
                <label for="pref-font-size">Tamaño de Fuente: <span id="pref-font-size-val">12pt</span></label>
                <input id="pref-font-size" type="range" min="8" max="22" step="1" value="12">
              </div>
            </div>
          </div>
          <footer class="prefs-foot">
            <button id="prefs-cancel" class="btn ghost">Cancelar</button>
            <button id="prefs-save" class="btn primary">Guardar</button>
          </footer>
        </section>
      `;

      const controls = {
        root,
        language: root.querySelector('#pref-language'),
        collection: root.querySelector('#pref-collection'),
        corpus: root.querySelector('#pref-corpus'),
        font: root.querySelector('#pref-font'),
        fontSize: root.querySelector('#pref-font-size'),
        fontSizeVal: root.querySelector('#pref-font-size-val'),
        color: root.querySelector('#pref-color'),
        colorHex: root.querySelector('#pref-color-hex'),
        light: root.querySelector('#pref-light'),
        lightText: root.querySelector('#pref-light-text'),
        btnCancel: root.querySelector('#prefs-cancel'),
        btnSave: root.querySelector('#prefs-save'),
      };

      // 👉 AQUÍ se cargan todas las opciones desde las prefs actuales
      fillFromPrefs(controls, current);

      // --- Eventos ---
      const applyStore = (prefs) => {
        store && store.apply && store.apply(prefs);
      };

      controls.btnCancel &&
        controls.btnCancel.addEventListener('click', function (e) {
          e.preventDefault();
          // Volvemos a las prefs guardadas y regresamos a la bienvenida
          const prev =
            (store && store.load && store.load()) || (store && store.DEFAULTS) || {};
          applyStore(prev);
          if (window.AppMain && window.AppMain.showWelcomeView) {
            window.AppMain.showWelcomeView();
          }
        });

      controls.btnSave &&
        controls.btnSave.addEventListener('click', function (e) {
          e.preventDefault();
          const prefs = buildPrefsFromUI(controls);
          const resolved = { ...(store && store.DEFAULTS), ...prefs };
          store && store.save && store.save(resolved);
          applyStore(resolved);
          if (window.AppMain && window.AppMain.showWelcomeView) {
            window.AppMain.showWelcomeView();
          }
        });

      controls.language &&
        controls.language.addEventListener('change', function () {
          const prefs = buildPrefsFromUI(controls);
          applyStore(prefs);
          applyTranslations(controls, prefs.language);
        });

      controls.collection &&
        controls.collection.addEventListener('change', function () {
          const prefs = buildPrefsFromUI(controls);
          fillCorpus(
            controls.corpus,
            controls.collection.value,
            prefs.corpus || null
          );
          applyStore(buildPrefsFromUI(controls));
        });

      controls.corpus &&
        controls.corpus.addEventListener('change', function () {
          applyStore(buildPrefsFromUI(controls));
        });

      controls.font &&
        controls.font.addEventListener('change', function () {
          applyStore(buildPrefsFromUI(controls));
        });

      controls.fontSize &&
        controls.fontSize.addEventListener('input', function () {
          const v = parseInt(controls.fontSize.value, 10) || 12;
          controls.fontSizeVal.textContent = v + 'pt';
          applyStore(buildPrefsFromUI(controls));
        });

      if (controls.color && controls.colorHex) {
        controls.color.addEventListener('input', function () {
          controls.colorHex.value = controls.color.value.toUpperCase();
          applyStore(buildPrefsFromUI(controls));
        });
        controls.colorHex.addEventListener('input', function () {
          const v = controls.colorHex.value.trim();
          if (/^#([A-Fa-f0-9]{6})$/.test(v)) {
            controls.color.value = v;
          }
          applyStore(buildPrefsFromUI(controls));
        });
      }

      controls.light &&
        controls.light.addEventListener('change', function () {
          const prefs = buildPrefsFromUI(controls);
          applyStore(prefs);
          updateLightText(controls, prefs.language, controls.light.checked);
        });
    });
  }

  // ---------- Delegación global para el botón del header ----------
  function bindPreferencesDelegation() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('#hdr-preferences');
      if (!btn) return;
      e.preventDefault();
      renderPreferencesScreen();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPreferencesDelegation);
  } else {
    bindPreferencesDelegation();
  }
})();
