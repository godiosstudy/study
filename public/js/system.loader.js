
// system.loader.js – overlay fullscreen que se llena con el color del sitio
window.SystemLoader = (function () {
  var overlayId = "app-loader";

  function getOverlay() {
    return document.getElementById(overlayId);
  }

  function show() {
    var el = getOverlay();
    if (el) el.style.display = "block";
    document.body.classList.add("app-loading");
  }

  function hide() {
    var el = getOverlay();
    if (el) el.style.display = "none";
    document.body.classList.remove("app-loading");
  }

  function setProgress(pct, text) {
    var el = getOverlay();
    if (!el) return;

    var fill   = el.querySelector("[data-loader-fill]");
    var lblPct = el.querySelector("[data-loader-pct]");
    var lblTxt = el.querySelector("[data-loader-text]");

    var v = typeof pct === "number" ? pct : 0;
    if (v < 0) v = 0;
    if (v > 100) v = 100;

    if (fill) {
      fill.style.height = v + "%";
    }
    if (lblPct) {
      lblPct.textContent = v + "%";
    }

    var finalLabel = (typeof text === "string" && text.trim())
      ? text
      : "Cargando";

    if (lblTxt) {
      lblTxt.textContent = finalLabel;
    }
  }

  return {
    show: show,
    hide: hide,
    setProgress: setProgress,
  };
})();
