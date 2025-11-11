;(function(){
  const CONTENT = {
    'Biblia': ['AT','NT'],
    'Corán': ['Libro'],
    'Talmud': ['Mishná','Guemará']
  };

  const FONT_EXTS = ['.woff2','.woff','.ttf','.otf','.ttc'];
  const FontMap = new Map();

  function basename(path){ const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')); return i >= 0 ? path.slice(i+1) : path; }
  function stripExt(name){
    const lower = name.toLowerCase();
    for (const ext of FONT_EXTS){ if (lower.endsWith(ext)) return name.slice(0, -ext.length); }
    return name;
  }
  function guessFamilyFromFilename(file){
    const base = stripExt(basename(file));
    const idx = base.indexOf('-');
    return (idx > 0 ? base.slice(0, idx) : base).replace(/[_]+/g,' ').trim();
  }

  async function tryDirectoryListingOnce(url){
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const anchors = Array.from(doc.querySelectorAll('a[href]'));
      const hrefs = anchors.map(a => a.getAttribute('href'));
      const files = hrefs.filter(h => (h||'').toLowerCase().endsWith('.woff2') || (h||'').toLowerCase().endsWith('.woff') || (h||'').toLowerCase().endsWith('.ttf') || (h||'').toLowerCase().endsWith('.otf') || (h||'').toLowerCase().endsWith('.ttc'));
      if (!files.length) return null;
      const norm = files.map(h => /^https?:\/\//i.test(h) ? h : (h.startsWith('/') ? h : ('fonts/' + h.replace(/^\.\//,''))));
      return norm;
    } catch { return null; }
  }
  async function discoverFonts(){
    const urls = await tryDirectoryListingOnce('fonts/');
    if (urls && urls.length){
      const map = new Map();
      for (const f of urls){
        const fam = guessFamilyFromFilename(f);
        if (!map.has(fam)) map.set(fam, []);
        map.get(fam).push(f);
      }
      for (const [fam, list] of map.entries()){
        FontMap.set(fam, list);
        ensureFontFaceInjected(fam, list);
      }
      return Array.from(map.keys());
    }
    // Fallback: try css/fonts.css
    try{
      const res = await fetch('css/fonts.css', { cache: 'no-store' });
      if (res.ok){
        const css = await res.text();
        const fams = new Set();
        const re = /@font-face[\s\S]*?font-family\s*:\s*(['\"]?)([^;'\"]+)\1\s*;/gi;
        let m; while((m = re.exec(css))) fams.add(m[2].trim());
        return Array.from(fams);
      }
    }catch{}
    return [];
  }
  function ensureFontFaceInjected(family, urls){
    const id = 'dyn-fontface-' + family.replace(/\s+/g,'-').toLowerCase();
    if (document.getElementById(id)) return;
    const w2 = urls.find(u=>u.toLowerCase().endsWith('.woff2'));
    const w1 = urls.find(u=>u.toLowerCase().endsWith('.woff'));
    const ttf = urls.find(u=>u.toLowerCase().endsWith('.ttf'));
    const otf = urls.find(u=>u.toLowerCase().endsWith('.otf'));
    const ttc = urls.find(u=>u.toLowerCase().endsWith('.ttc'));
    const src = [];
    if (w2) src.push(`url('${w2}') format('woff2')`);
    if (w1) src.push(`url('${w1}') format('woff')`);
    if (ttf) src.push(`url('${ttf}') format('truetype')`);
    if (otf) src.push(`url('${otf}') format('opentype')`);
    if (ttc) src.push(`url('${ttc}') format('truetype')`);
    if (!src.length) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@font-face{font-family:'${family}';src:${src.join(', ')};font-weight:100 900;font-style:normal;font-display:swap;}`;
    document.head.appendChild(style);
  }

  function createModal() {
    if (document.getElementById('prefs-modal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'prefs-modal';
    wrap.className = 'prefs-modal';
    wrap.setAttribute('aria-hidden','true');
    wrap.setAttribute('inert','');
    wrap.innerHTML = `
      <div class="prefs-dialog" role="dialog" aria-modal="true" aria-labelledby="prefs-title" tabindex="-1">
        <header class="prefs-head">
          <h2 id="prefs-title">Preferencias</h2>
          <button class="prefs-close" id="prefs-close" aria-label="Cerrar">×</button>
        </header>
        <div class="prefs-body">
          <div class="prefs-field">
            <label for="pref-language">Language</label>
            <select id="pref-language"></select>
          </div>
          <div class="prefs-field">
            <label for="pref-collection">Collection</label>
            <select id="pref-collection"></select>
          </div>
          <div class="prefs-field">
            <label for="pref-corpus">Corpus</label>
            <select id="pref-corpus"></select>
          </div>
          <div class="prefs-field">
            <label for="pref-font">Font Type</label>
            <select id="pref-font"></select>
          </div>
          <div class="prefs-field">
            <label for="pref-font-size">Font Size: <span id="pref-font-size-val">12pt</span></label>
            <input id="pref-font-size" type="range" min="8" max="22" step="1" value="12">
          </div>
          <div class="prefs-inline">
            <div class="prefs-field">
              <label for="pref-color">Color (accent)</label>
              <div class="prefs-color">
                <input id="pref-color" type="color" value="#000000">
                <input id="pref-color-hex" type="text" value="#000000" maxlength="7" pattern="^#([A-Fa-f0-9]{6})$">
              </div>
            </div>
            <div class="prefs-field">
              <label>Light</label>
              <div class="prefs-toggle">
                <button id="pref-light-on"  data-val="on"  class="toggle active">On</button>
                <button id="pref-light-off" data-val="off" class="toggle">Off</button>
              </div>
            </div>
          </div>
        </div>
        <footer class="prefs-foot">
          <button id="prefs-cancel" class="btn ghost">Cancelar</button>
          <button id="prefs-save" class="btn primary">Guardar</button>
        </footer>
      </div>`;
    document.body.appendChild(wrap);
  }

  function firstFocusable(root){
    return root.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  }

  function open(){
    const m = document.getElementById('prefs-modal');
    if (!m) return;
    m.classList.add('open');
    m.removeAttribute('aria-hidden');
    m.removeAttribute('inert');
    const dlg = m.querySelector('.prefs-dialog');
    const first = firstFocusable(dlg) || dlg;
    first && first.focus();
  }

  function close(opener){
    const m = document.getElementById('prefs-modal');
    if (!m) return;
    // Move focus OUT before hiding
    if (opener) try { opener.focus(); } catch {}
    if (document.activeElement && m.contains(document.activeElement)) {
      try { document.activeElement.blur(); } catch {}
    }
    m.classList.remove('open');
    m.setAttribute('aria-hidden','true');
    m.setAttribute('inert','');
  }

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
  function setLight(onBtn, offBtn, val){
    [onBtn, offBtn].forEach(b=>b.classList.remove('active'));
    if (val === 'off') offBtn.classList.add('active'); else onBtn.classList.add('active');
  }
  function syncHexFromPicker(picker, hex){ hex.value = picker.value.toUpperCase(); }
  function syncPickerFromHex(hex, picker){
    const v = hex.value.trim();
    if (/^#([A-Fa-f0-9]{6})$/.test(v)) picker.value = v;
  }
  function buildPreviewPrefs(saved){
    const light = document.getElementById('pref-light-off').classList.contains('active') ? 'off' : 'on';
    return {
      ...saved,
      language: document.getElementById('pref-language').value,
      collection: document.getElementById('pref-collection').value,
      corpus: document.getElementById('pref-corpus').value,
      font: document.getElementById('pref-font').value,
      fontSizePt: parseInt(document.getElementById('pref-font-size').value, 10),
      colorHex: document.getElementById('pref-color').value,
      light
    };
  }

  async function preloadFontFamily(family){
    try {
      const urls = FontMap.get(family);
      if (urls && urls.length) ensureFontFaceInjected(family, urls);
      if (document.fonts && document.fonts.load) {
        const timeout = new Promise(res => setTimeout(res, 1200));
        await Promise.race([
          (async () => {
            await document.fonts.load(`400 1em "${family}"`);
            await document.fonts.load(`700 1em "${family}"`);
          })(),
          timeout
        ]);
      }
    } catch {}
  }

  async function mount(savedSnapshot){
    createModal();

    const selLang = document.getElementById('pref-language');
    const selCollection = document.getElementById('pref-collection');
    const selCorpus = document.getElementById('pref-corpus');
    const selFont = document.getElementById('pref-font');
    const rngSize = document.getElementById('pref-font-size');
    const lblSize = document.getElementById('pref-font-size-val');
    const inpColor = document.getElementById('pref-color');
    const inpHex = document.getElementById('pref-color-hex');
    const lightOn = document.getElementById('pref-light-on');
    const lightOff = document.getElementById('pref-light-off');

    const prefs = window.PrefsStore.load() || { ...window.PrefsStore.DEFAULTS };

    window.LanguagePrefs.mountLanguageSelect(selLang, prefs.language);

    const selCol = fillCollections(selCollection, prefs.collection);
    fillCorpus(selCorpus, selCol, prefs.corpus);
    selCollection.addEventListener('change', ()=> fillCorpus(selCorpus, selCollection.value, null));

    const fontFamilies = await discoverFonts();
    fillFonts(selFont, fontFamilies, prefs.font);

    rngSize.value = String(prefs.fontSizePt || 12);
    lblSize.textContent = `${rngSize.value}pt`;

    inpColor.value = (prefs.colorHex || '#000000');
    inpHex.value = (prefs.colorHex || '#000000').toUpperCase();

    setLight(lightOn, lightOff, prefs.light || 'on');

    async function previewFontThenApply(){
      const fam = selFont.value;
      const temp = buildPreviewPrefs(prefs);
      window.PrefsStore.apply(temp);
      await preloadFontFamily(fam);
      window.PrefsStore.apply(buildPreviewPrefs(prefs));
    }
    selFont.addEventListener('change', previewFontThenApply);
    rngSize.addEventListener('input', ()=>{ lblSize.textContent = `${rngSize.value}pt`; window.PrefsStore.apply(buildPreviewPrefs(prefs)); });
    inpColor.addEventListener('input', ()=>{ syncHexFromPicker(inpColor, inpHex); window.PrefsStore.apply(buildPreviewPrefs(prefs)); });
    inpHex.addEventListener('input', ()=>{ syncPickerFromHex(inpHex, inpColor); window.PrefsStore.apply(buildPreviewPrefs(prefs)); });
    lightOn.addEventListener('click', ()=>{ setLight(lightOn, lightOff, 'on'); window.PrefsStore.apply(buildPreviewPrefs(prefs)); });
    lightOff.addEventListener('click', ()=>{ setLight(lightOn, lightOff, 'off'); window.PrefsStore.apply(buildPreviewPrefs(prefs)); });

    document.getElementById('prefs-close').addEventListener('click', ()=> close(document.getElementById('hdr-preferences')));
    document.getElementById('prefs-cancel').addEventListener('click', ()=> close(document.getElementById('hdr-preferences')));
    document.getElementById('prefs-save').addEventListener('click', ()=>{
      const next = buildPreviewPrefs(prefs);
      const resolved = { ...window.PrefsStore.DEFAULTS, ...next };
      window.PrefsStore.save(resolved);
      window.PrefsStore.apply(resolved);
      close(document.getElementById('hdr-preferences'));
    });

    return document.getElementById('prefs-modal');
  }

  function bindOpenHandler(){
    const btnOpen = document.getElementById('hdr-preferences');
    if (!btnOpen) return;
    btnOpen.addEventListener('click', async ()=>{
      const savedSnapshot = window.PrefsStore.load() || { ...window.PrefsStore.DEFAULTS };
      const modal = await mount(savedSnapshot);
      open();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindOpenHandler);
  else bindOpenHandler();

  document.addEventListener('click', async (e)=>{
    const t = e.target;
    if (t && t.id === 'hdr-preferences') {
      const savedSnapshot = window.PrefsStore.load() || { ...window.PrefsStore.DEFAULTS };
      await mount(savedSnapshot);
      open();
    }
  });

  window.PrefsUI = { open: async ()=>{
    const savedSnapshot = window.PrefsStore.load() || { ...window.PrefsStore.DEFAULTS };
    await mount(savedSnapshot);
    open();
  } };
})();