;(function(){
  function normalize(code){
    code = (code || '').toLowerCase();
    if (code.startsWith('en')) return 'en';
    if (code.startsWith('es')) return 'es';
    return 'es';
  }
  function deviceLang(){
    try { return normalize(navigator.language || (navigator.languages && navigator.languages[0]) || 'es'); }
    catch { return 'es'; }
  }
  function t(path, fallback){
    const lang = (window.PrefsStore?.load()?.language) || deviceLang();
    const parts = (path||'').split('.');
    let cur = window.I18n && window.I18n.__TR && window.I18n.__TR[lang];
    for (const p of parts){ if (!cur) break; cur = cur[p]; }
    return (cur != null ? cur : (fallback ?? path));
  }
  function applyDomainLabel(lang){
    const el = document.getElementById('hdr-domain');
    if (el){
      const label = (window.I18n?.__TR?.[lang]?.domain?.title) || 'Study.GODiOS.org';
      el.textContent = label;
    }
  }
  function ensureStartupLanguage(){
    const prefs = (window.PrefsStore && window.PrefsStore.load && window.PrefsStore.load()) || null;
    let lang = prefs && prefs.language;
    if (!lang){ lang = deviceLang(); }
    lang = normalize(lang);
    try { document.documentElement.setAttribute('lang', lang); } catch {}
    // If PrefsStore exists but had no language, persist it once to sync components
    if (window.PrefsStore){
      const current = window.PrefsStore.load() || { ...window.PrefsStore.DEFAULTS };
      if (current.language !== lang){
        const next = { ...current, language: lang };
        try { window.PrefsStore.save(next); window.PrefsStore.apply(next); } catch {}
      } else {
        try { window.PrefsStore.apply(current); } catch {}
      }
    }
    applyDomainLabel(lang);
    window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
  }
  function initToolbarPlaceholder(){
    const input = document.getElementById('tbar-search');
    if (input){
      input.setAttribute('placeholder', t('toolbar.search'));
    }
  }
  function init(){
    ensureStartupLanguage();
    initToolbarPlaceholder();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();