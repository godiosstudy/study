
// system.loader.js – overlay fullscreen que se llena con el color del sitio
window.SystemLoader = (function () {
  var overlayId = "app-loader";

  function getOverlay() {
    return document.getElementById(overlayId);
  }

  function show() {
    var el = getOverlay();
    if (el) {
      el.style.display = "block";
      // reset visual state every time we show the loader
      var fill = el.querySelector("[data-loader-fill]");
      var label = el.querySelector("[data-loader-pct]");
      var lblTxt = el.querySelector("[data-loader-text]");
      if (fill) fill.style.height = "0%";
      if (label) label.textContent = "0%";
      if (lblTxt) lblTxt.textContent = "Cargando";
    }
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

    // Siempre mostramos al menos una pequeña franja de color para evitar pantalla blanca
    var h = v <= 0 ? 3 : v;

    if (fill) {
      fill.style.height = h + "%";
    }
    if (lblPct) {
      lblPct.textContent = v + "%";
    }

    var finalLabel = (typeof text === "string" && text.trim())
      ? text
      : "Cargando";

    if (lblTxt) {
      lblTxt.textContent = finalLabel;
      // Cambiamos el color del texto según cuánto haya subido el fondo:
      // cuando la franja de color ya pasó por detrás del texto (aprox mitad),
      // lo mostramos en blanco para que siga siendo legible.
      try {
        if (h >= 40) {
          lblTxt.style.color = "#ffffff";
        } else {
          lblTxt.style.color = "#000000";
        }
      } catch (e) {}
    }
  }
  return {
    show: show,
    hide: hide,
    setProgress: setProgress,
  };
})();