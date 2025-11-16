;(function () {
  // =========================
  // 1. Defaults + storage key
  // =========================
  const DEFAULTS = {
    language: 'es',          // se ajusta en bootstrap según navigator.*
    collection: null,
    corpus: null,
    font: null,              // nombre de la font-face o null para sistema
    fontSizePt: 12,          // tamaño base en pt
    colorHex: '#000000',     // color de sistema
    light: 'on',             // 'on' | 'off' (solo afecta MAIN)
  };

  const STORAGE_KEY = 'godios_prefs_v1';

  // =========================
  // 2. Helpers de almacenamiento
  // =========================
  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function loadRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? safeParse(raw) : null;
    } catch {
      return null;
    }
  }

  function load() {
    const raw = loadRaw();
    return Object.assign({}, DEFAULTS, raw || {});
  }

  function save(prefs) {
    const data = Object.assign({}, DEFAULTS, prefs || {});
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('PrefsStore.save error', e);
    }
    return data;
  }

  // =========================
  // 3. Helpers de color
  // =========================
  function parseCSSColor(c) {
    c = (c || '').trim();
    if (!c) return { r: 255, g: 255, b: 255 };

    if (c.startsWith('#')) {
      let hex = c.slice(1);
      if (hex.length === 3) {
        hex = hex.split('').map((x) => x + x).join('');
      }
      const n = parseInt(hex, 16);
      return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: n & 255,
      };
    }

    const m = c.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) {
      return { r: +m[1], g: +m[2], b: +m[3] };
    }

    return { r: 255, g: 255, b: 255 };
  }

  function rgbToHex({ r, g, b }) {
    const h = (n) => n.toString(16).padStart(2, '0');
    return '#' + h(Math.round(r)) + h(Math.round(g)) + h(Math.round(b));
  }

  // mezcla fg sobre bg con alpha (0..1)
  function blend(fgHex, bgCss, alpha) {
    const fg = parseCSSColor(fgHex);
    const bg = parseCSSColor(bgCss);
    const r = bg.r * (1 - alpha) + fg.r * alpha;
    const g = bg.g * (1 - alpha) + fg.g * alpha;
    const b = bg.b * (1 - alpha) + fg.b * alpha;
    return rgbToHex({ r, g, b });
  }

  // texto negro/blanco según contraste
  function contrastText(hex) {
    const { r, g, b } = parseCSSColor(hex);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum > 0.6 ? '#000000' : '#ffffff';
  }

  // =========================
  // 4. LUZ: solo afecta #app-main
  // =========================
  function applyMainLight(light) {
    const main = document.getElementById('app-main');
    if (!main) return;

    if (light === 'off') {
      // LUZ Off → invertimos solo el main (CSS se encarga con filter)
      main.setAttribute('data-light', 'off');
    } else {
      // LUZ On → normal
      main.removeAttribute('data-light');
    }
  }

  // =========================
  // 5. Aplicar preferencias al sistema
  // =========================
  function apply(prefsInput) {
    const prefs = Object.assign({}, DEFAULTS, prefsInput || {});
    const docEl = document.documentElement;

    // ---- LUZ solo main ----
    applyMainLight(prefs.light);

    // ---- Tamaño de fuente base ----
    const sizeVal = prefs.fontSizePt + 'pt';
    docEl.style.setProperty('--base-pt', sizeVal);

    // ---- Familia de fuente ----
    const famValue =
      prefs.font && prefs.font.trim()
        ? "'" + prefs.font.trim() + "', var(--app-font-fallback)"
        : 'var(--app-font-fallback)';

    docEl.style.setProperty('--app-font', famValue);
    try {
      if (document.body) {
        document.body.style.fontFamily = famValue;
      }
    } catch (e) {
      console.warn('PrefsStore.apply font error', e);
    }

    // ---- Color de sistema (accent) ----
    const accent = prefs.colorHex || '#000000';
    docEl.style.setProperty('--accent', accent);

    // Header / Footer usan el color de sistema
    const headFg = contrastText(accent);
    docEl.style.setProperty('--header-bg', accent);
    docEl.style.setProperty('--header-fg', headFg);
    docEl.style.setProperty('--footer-bg', accent);
    docEl.style.setProperty('--footer-fg', headFg);

    // Main tint 3% (fondo suave, NO relacionado con LUZ)
    try {
      const bg = getComputedStyle(docEl).getPropertyValue('--bg') || '#ffffff';
      const mainTint = blend(accent, bg, 0.03);
      docEl.style.setProperty('--main-bg', mainTint);
    } catch (e) {
      console.warn('PrefsStore.apply blend error', e);
    }

    // Idioma → SystemLanguage
    try {
      if (window.SystemLanguage && typeof window.SystemLanguage.setCurrent === 'function') {
        const lang = prefs.language || 'es';
        window.SystemLanguage.setCurrent(lang);
        window.dispatchEvent(
          new CustomEvent('i18n:changed', { detail: { language: lang } }),
        );
      }
    } catch (e) {
      console.warn('PrefsStore.apply language error', e);
    }

    // Notificar al resto del sistema
    try {
      window.dispatchEvent(new CustomEvent('prefs:applied', { detail: prefs }));
    } catch (e) {
      console.warn('PrefsStore.apply event error', e);
    }

    return prefs;
  }

  // =========================
  // 6. Bootstrap al cargar la página
  // =========================
  const existing = loadRaw();
  let initial;

  if (existing) {
    initial = Object.assign({}, DEFAULTS, existing);
  } else {
    // Detectar idioma del equipo la PRIMERA vez
    let lang = 'en';
    try {
      const navLang =
        (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (navLang.startsWith('es')) lang = 'es';
      else if (navLang.startsWith('en')) lang = 'en';
    } catch (e) {
      // si no hay info, queda 'en'
    }
    initial = Object.assign({}, DEFAULTS, { language: lang });
    save(initial);
  }

  apply(initial);

  // =========================
  // 7. Exponer API global
  // =========================
  const PrefsStore = {
    STORAGE_KEY,
    DEFAULTS,
    load,
    save,
    apply,
  };

  window.PrefsStore = PrefsStore;
  window.SystemPrefsStore = PrefsStore;
})();
