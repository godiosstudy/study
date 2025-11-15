;(function () {
  function loadPrefs() {
    try {
      return window.PrefsStore && window.PrefsStore.load
        ? window.PrefsStore.load()
        : null;
    } catch {
      return null;
    }
  }

  function currentLang() {
    const prefs = loadPrefs();
    return (prefs && prefs.language) || "es";
  }

  function resolveDomainTitle() {
    const lang = currentLang();
    const TR = window.I18n && window.I18n.__TR;
    let label = "Study.GODiOS.org";

    try {
      if (TR && TR[lang] && TR[lang].domain && TR[lang].domain.title) {
        label = TR[lang].domain.title;
      }
    } catch {}

    return label;
  }

  function applyDomain() {
    const el = document.getElementById("hdr-domain");
    if (!el) return;
    el.textContent = resolveDomainTitle();
  }

  function init() {
    applyDomain();
    // cuando cambian las preferencias (incluye cambio de idioma)
    window.addEventListener("prefs:applied", applyDomain);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
