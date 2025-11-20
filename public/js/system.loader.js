// system.loader.js – control de overlay de carga con progreso
window.SystemLoader = (function () {
  var overlayId = "app-loader";

  function getOverlay() {
    return document.getElementById(overlayId);
  }

  function show() {
    var el = getOverlay();
    if (el) el.style.display = "flex";
  }

  function hide() {
    var el = getOverlay();
    if (el) el.style.display = "none";
  }

  function resolveLanguage() {
    var language = "es";
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === "function") {
        var p = window.PrefsStore.load() || {};
        if (p.language) language = p.language;
      } else if (document.documentElement && document.documentElement.lang) {
        language = document.documentElement.lang || "es";
      }
    } catch (e) {}
    return language === "en" ? "en" : "es";
  }

  function setProgress(pct, text) {
    var el = getOverlay();
    if (!el) return;

    var bar = el.querySelector("[data-loader-bar]");
    var lblPct = el.querySelector("[data-loader-pct]");
    var lblTxt = el.querySelector("[data-loader-text]");

    var v = typeof pct === "number" ? pct : 0;
    if (v < 0) v = 0;
    if (v > 100) v = 100;

    if (bar) {
      bar.style.height = v + "%";
    }
    if (lblPct) {
      lblPct.textContent = v + "%";
    }

    var lang = resolveLanguage();
    var baseLabel = lang === "en" ? "Loading" : "Cargando";
    var finalLabel = (typeof text === "string" && text.trim()) ? text : baseLabel;

    if (lblTxt) {
      lblTxt.textContent = finalLabel + " " + v + "%";
    }
  }

  return {
    show: show,
    hide: hide,
    setProgress: setProgress,
  };
})();
