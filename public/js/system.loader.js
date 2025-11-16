// system.loader.js – control de overlay de carga
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

  return {
    show: show,
    hide: hide,
  };
})();
