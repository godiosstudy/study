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
      bar.style.width = v + "%";
    }
    if (lblPct) {
      lblPct.textContent = v + "%";
    }
    if (lblTxt && text) {
      lblTxt.textContent = text;
    }
  }

  return {
    show: show,
    hide: hide,
    setProgress: setProgress,
  };
})();
