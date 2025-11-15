;(function(){
  const CONTENT = {
    'Biblia': ['AT','NT'],
    'Corán': ['Libro'],
    'Talmud': ['Mishná','Guemará']
  };

  // ---------- Fuentes desde @font-face en CSS ----------
  let cachedFontFamilies = null;

  function cleanFontName(name) {
    if (!name) return '';
    return name
      .trim()
      .replace(/^['"]+|['"]+$/g, ''); // quita comillas
  }

  function getFontFamiliesFromCSS(){
    if (cachedFontFamilies) return cachedFontFamilies;

    const famSet = new Set();

    const sheets = Array.from(document.styleSheets || []);
    sheets.forEach(sheet => {
      let rules;
      try {
        rules = sheet.cssRules || sheet.rules;
      } catch (e) {
        // algunas hojas pueden ser cross-origin, las ignoramos
        return;
      }
      if (!rules) return;

      Array.from(rules).forEach(rule => {
        // CSSFontFaceRule en la mayoría de navegadores
        const isFontFace =
          (window.CSSRule && rule.type === CSSRule.FONT_FACE_RULE) ||
          (rule.constructor && rule.constructor.name === 'CSSFontFaceRule') ||
          (rule.cssText && /^@font-face/i.test(rule.cssText));

        if (!isFontFace) return;

        const famRaw =
          (rule.style && (rule.style.getPropertyValue('font-family') || rule.style.fontFamily)) ||
          '';

        if (!famRaw) return;

        famRaw.split(',').forEach(part => {
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

  // Si en algún momento quisieras forzar otra cosa, esta función existe,
  // pero ahora no inyectamos nada dinámico: todo viene de fontfaces.css
  function ensureFontFaceInjected(/*family*/){
    // no-op: las fuentes ya están definidas en CSS (fontfaces.css)
  }

  // ---------- Estado del modal ----------
  let modal = null;
  let controls = {};
  let lastSavedPrefs = null;
  let initialized = false;

  function ensureModal(){
    if (initialized) return;
    modal = document.getElementById('prefs-modal');
    if (!modal){
      modal = document.createElement('div');
      modal.id = 'prefs-modal';
      modal.className = 'prefs-modal';
      modal.setAttribute('aria-hidden','true');
      modal.setAttribute('inert','');
      modal.innerHTML = `
        <div class="prefs-dialog" role="dialog" aria-modal="true" aria-labelledby="prefs-title" tabindex="-1">
          <header class="prefs-head">
            <h2 id="prefs-title">Preferencias</h2>
            <button class="prefs-close" id="prefs-close" aria-label="Cerrar">×</button>
          </header>
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
        </div>`;
      document.body.appendChild(modal);
    }

    const dlg = modal.querySelector('.prefs-dialog');
    controls = {
      dialog: dlg,
      language: modal.querySelector('#pref-language'),
      collection: modal.querySelector('#pref-collection'),
      corpus: modal.querySelector('#pref-corpus'),
      font: modal.querySelector('#pref-font'),
      fontSize: modal.querySelector('#pref-font-size'),
      fontSizeVal: modal.querySelector('#pref-font-size-val'),
      color: modal.querySelector('#pref-color'),
      colorHex: modal.querySelector('#pref-color-hex'),
      light: modal.querySelector('#pref-light'),
      lightText: modal.querySelector('#pref-light-text'),
      btnClose: modal.querySelector('#prefs-close'),
      btnCancel: modal.querySelector('#prefs-cancel'),
      btnSave: modal.querySelector('#prefs-save'),
    };

    attachEventHandlers();
    initialized = true;
  }

  // ---------- i18n ----------
  function getLang(prefs){
    if (prefs && prefs.language) return prefs.language;
    const store = window.PrefsStore;
    return (store && store.DEFAULTS && store.DEFAULTS.language) || 'es';
  }
  function getTR(lang){
    const base = window.I18n && window.I18n.__TR;
    return base ? base[lang] : null;
  }
  function getPrefsSection(lang){
    const tr = getTR(lang);
    return tr && tr.prefs ? tr.prefs : null;
  }
  function updateLightText(lang, isOn){
    if (!controls.lightText) return;
    const P = getPrefsSection(lang);
    let txt = isOn ? 'On' : 'Off';
    if (P && P.light){
      txt = isOn ? (P.light.on || txt) : (P.light.off || txt);
    }
    controls.lightText.textContent = txt;
  }
  function applyTranslations(lang){
    const P = getPrefsSection(lang);
    if (!P || !controls.dialog) {
      updateLightText(lang, controls.light && controls.light.checked);
      return;
    }
    const labels = P.labels || {};
    const titleEl = controls.dialog.querySelector('#prefs-title');
    if (titleEl && P.title) titleEl.textContent = P.title;

    const map = [
      ['label[for="pref-language"]', labels.language],
      ['label[for="pref-color"]', labels.colorAccent],
      ['label[for="pref-light"]', labels.light],
      ['label[for="pref-collection"]', labels.collection],
      ['label[for="pref-corpus"]', labels.corpus],
      ['label[for="pref-font"]', labels.fontType],
      ['label[for="pref-font-size"]', labels.fontSize],
    ];
    map.forEach(([sel, txt])=>{
      const el = controls.dialog.querySelector(sel);
      if (el && txt) el.textContent = txt;
    });

    const actions = P.actions || {};
    if (controls.btnCancel && actions.cancel) controls.btnCancel.textContent = actions.cancel;
    if (controls.btnSave && actions.save) controls.btnSave.textContent = actions.save;

    updateLightText(lang, controls.light && controls.light.checked);
  }

  // ---------- helpers de UI ----------
  function fillCollections(selectEl, current){
    selectEl.innerHTML='';
    const keys = Object.keys(CONTENT);
    keys.forEach((k,idx)=>{
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = k;
      if ((current && current===k) || (!current && idx===0)) opt.selected = true;
      selectEl.appendChild(opt);
    });
    return selectEl.value;
  }
  function fillCorpus(selectEl, collection, current){
    selectEl.innerHTML='';
    const list = CONTENT[collection] || [];
    list.forEach((c,idx)=>{
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      if ((current && current===c) || (!current && idx===0)) opt.selected = true;
      selectEl.appendChild(opt);
    });
    return selectEl.value;
  }
  function fillFonts(selectEl, fontsList, current){
    selectEl.innerHTML='';
    const list = fontsList.length ? fontsList : ['System'];
    list.forEach((f,idx)=>{
      const opt = document.createElement('option');
      opt.value = f; opt.textContent = f;
      if ((current && current===f) || (!current && idx===0)) opt.selected = true;
      selectEl.appendChild(opt);
    });
    return selectEl.value;
  }

  // ---------- prefs ----------
  function buildPrefsFromUI(){
    const store = window.PrefsStore;
    const base = (store && (store.load && store.load()) ) || (store && store.DEFAULTS) || {};
    const prefs = { ...base };
    if (controls.language) prefs.language = controls.language.value || prefs.language;
    if (controls.collection) prefs.collection = controls.collection.value || prefs.collection;
    if (controls.corpus) prefs.corpus = controls.corpus.value || prefs.corpus;
    if (controls.font) prefs.font = controls.font.value || prefs.font;
    if (controls.fontSize) prefs.fontSizePt = parseInt(controls.fontSize.value, 10) || prefs.fontSizePt || 12;
    if (controls.color) prefs.colorHex = controls.color.value || prefs.colorHex || '#000000';
    if (controls.light) prefs.light = controls.light.checked ? 'on' : 'off';
    return prefs;
  }

  function fillFromPrefs(prefs){
    const lang = getLang(prefs);

    // Idioma con banderitas
    if (controls.language && window.LanguagePrefs && window.LanguagePrefs.mountLanguageSelect){
      window.LanguagePrefs.mountLanguageSelect(controls.language, lang);
    } else if (controls.language){
      controls.language.value = lang;
    }

    const col = fillCollections(controls.collection, prefs.collection || null);
    fillCorpus(controls.corpus, col, prefs.corpus || null);

    // Fuentes desde CSS (@font-face)
    const families = getFontFamiliesFromCSS();
    fillFonts(controls.font, families, prefs.font || null);
    ensureFontFaceInjected(controls.font.value);

    const size = prefs.fontSizePt || 12;
    controls.fontSize.value = String(size);
    controls.fontSizeVal.textContent = size + 'pt';

    const color = prefs.colorHex || '#000000';
    controls.color.value = color;
    controls.colorHex.value = color.toUpperCase();

    const isLightOn = (prefs.light || 'on') !== 'off';
    controls.light.checked = isLightOn;

    applyTranslations(lang);
  }

  function showModal(){
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    modal.removeAttribute('inert');
    if (controls.dialog) controls.dialog.focus();
  }

  function hideModal(){
    if (!modal) return;

    // Mover el foco fuera del modal para evitar el warning de aria-hidden
    const active = document.activeElement;
    if (active && modal.contains(active)) {
      const trigger = document.getElementById('hdr-preferences');
      if (trigger) {
        trigger.focus();
      } else {
        active.blur();
      }
    }

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    modal.setAttribute('inert','');
  }

  function attachEventHandlers(){
    if (!controls.dialog) return;

    controls.btnClose && controls.btnClose.addEventListener('click', ()=>{
      if (lastSavedPrefs && window.PrefsStore && window.PrefsStore.apply){
        window.PrefsStore.apply(lastSavedPrefs);
      }
      hideModal();
    });

    controls.btnCancel && controls.btnCancel.addEventListener('click', ()=>{
      if (lastSavedPrefs && window.PrefsStore && window.PrefsStore.apply){
        window.PrefsStore.apply(lastSavedPrefs);
      }
      hideModal();
    });

    controls.btnSave && controls.btnSave.addEventListener('click', ()=>{
      const store = window.PrefsStore;
      if (!store) { hideModal(); return; }
      const prefs = buildPrefsFromUI();
      ensureFontFaceInjected(prefs.font);
      const resolved = { ...(store.DEFAULTS || {}), ...prefs };
      store.save && store.save(resolved);
      store.apply && store.apply(resolved);
      lastSavedPrefs = resolved;
      hideModal();
    });

    controls.language && controls.language.addEventListener('change', ()=>{
      const prefs = buildPrefsFromUI();
      const store = window.PrefsStore;
      store && store.apply && store.apply(prefs);
      applyTranslations(prefs.language);
    });

    controls.collection && controls.collection.addEventListener('change', ()=>{
      const prefs = buildPrefsFromUI();
      fillCorpus(controls.corpus, controls.collection.value, prefs.corpus || null);
      const store = window.PrefsStore;
      store && store.apply && store.apply(buildPrefsFromUI());
    });

    controls.corpus && controls.corpus.addEventListener('change', ()=>{
      const store = window.PrefsStore;
      store && store.apply && store.apply(buildPrefsFromUI());
    });

    controls.font && controls.font.addEventListener('change', ()=>{
      const prefs = buildPrefsFromUI();
      ensureFontFaceInjected(prefs.font);
      const store = window.PrefsStore;
      store && store.apply && store.apply(prefs);
    });

    controls.fontSize && controls.fontSize.addEventListener('input', ()=>{
      const v = parseInt(controls.fontSize.value, 10) || 12;
      controls.fontSizeVal.textContent = v + 'pt';
      const store = window.PrefsStore;
      store && store.apply && store.apply(buildPrefsFromUI());
    });

    if (controls.color && controls.colorHex){
      controls.color.addEventListener('input', ()=>{
        controls.colorHex.value = controls.color.value.toUpperCase();
        const store = window.PrefsStore;
        store && store.apply && store.apply(buildPrefsFromUI());
      });
      controls.colorHex.addEventListener('input', ()=>{
        const v = controls.colorHex.value.trim();
        if (/^#([A-Fa-f0-9]{6})$/.test(v)) controls.color.value = v;
        const store = window.PrefsStore;
        store && store.apply && store.apply(buildPrefsFromUI());
      });
    }

    controls.light && controls.light.addEventListener('change', ()=>{
      const prefs = buildPrefsFromUI();
      const store = window.PrefsStore;
      store && store.apply && store.apply(prefs);
      updateLightText(prefs.language, controls.light.checked);
    });
  }

  function open(){
    ensureModal();
    const store = window.PrefsStore;
    const current = (store && store.load && store.load()) || (store && store.DEFAULTS) || {};
    lastSavedPrefs = { ...(store && store.DEFAULTS || {}), ...current };
    fillFromPrefs(lastSavedPrefs);
    showModal();
  }

  // ---------- botón de preferencias (delegado) ----------
  function bindPreferencesButton() {
    document.addEventListener('click', function(e){
      const btn = e.target && e.target.closest && e.target.closest('#hdr-preferences');
      if (!btn) return;
      e.preventDefault();
      open();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPreferencesButton);
  } else {
    bindPreferencesButton();
  }

  // API pública
  window.Prefs = { open };

})();
