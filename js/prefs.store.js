;(function(){
  const DEFAULTS = {
    language: 'es',
    collection: null,
    corpus: null,
    font: null,
    fontSizePt: 12,
    colorHex: '#000000',
    light: 'on',
  };
  const STORAGE_KEY = 'godios_prefs_v1';

  function load(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function save(prefs){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }

  // Color helpers
  function parseCSSColor(c){
    c = (c || '').trim();
    if (!c) return {r:255,g:255,b:255};
    if (c.startsWith('#')){
      const hex = c.slice(1);
      const v = hex.length===3 ? hex.split('').map(x=>x+x).join('') : hex;
      const n = parseInt(v, 16);
      return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
    }
    const m = c.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return { r:+m[1], g:+m[2], b:+m[3] };
    return {r:255,g:255,b:255};
  }
  function rgbToHex({r,g,b}){
    const h = (n)=> n.toString(16).padStart(2,'0');
    return '#' + h(Math.round(r)) + h(Math.round(g)) + h(Math.round(b));
  }
  function blend(fgHex, bgCss, alpha){
    const fg = parseCSSColor(fgHex);
    const bg = parseCSSColor(bgCss);
    const r = bg.r*(1-alpha) + fg.r*alpha;
    const g = bg.g*(1-alpha) + fg.g*alpha;
    const b = bg.b*(1-alpha) + fg.b*alpha;
    return rgbToHex({r,g,b});
  }
  function contrastText(hex){
    const {r,g,b} = parseCSSColor(hex);
    const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return lum > 0.6 ? '#000000' : '#ffffff';
  }

  function apply(prefs){
    document.documentElement.setAttribute('data-light', prefs.light === 'off' ? 'off' : 'on');

    // Tamaño
    const sizeVal = prefs.fontSizePt + 'pt';
    document.documentElement.style.setProperty('--base-pt', sizeVal);

    // Familia de fuente (robusto): variable CSS + inline style en body para ganar especificidad si hay overrides
    const famValue = (prefs.font && prefs.font.trim())
      ? `'${prefs.font}', var(--app-font-fallback)`
      : 'var(--app-font-fallback)';
    document.documentElement.style.setProperty('--app-font', famValue);
    // Aplica también directo al body para asegurar el cambio visual inmediato
    try { document.body && (document.body.style.fontFamily = famValue); } catch {}

    // Accent
    const accent = prefs.colorHex || '#000000';
    document.documentElement.style.setProperty('--accent', accent);

    // Header/Footer
    const headFg = contrastText(accent);
    document.documentElement.style.setProperty('--header-bg', accent);
    document.documentElement.style.setProperty('--header-fg', headFg);
    document.documentElement.style.setProperty('--footer-bg', accent);
    document.documentElement.style.setProperty('--footer-fg', headFg);

    // Main tint 3%
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg');
    const mainTint = blend(accent, bg, 0.03);
    document.documentElement.style.setProperty('--main-bg', mainTint);

    window.dispatchEvent(new CustomEvent('prefs:applied', { detail: prefs }));
  }

  window.PrefsStore = { STORAGE_KEY, DEFAULTS, load, save, apply };

  const existing = load();
  if (existing) { apply(existing); }
  else { const initial = { ...DEFAULTS }; save(initial); apply(initial); }
})();