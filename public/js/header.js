// header.js – inicializa el header (dominio a la izquierda + botones a la derecha)
(function () {
  function init() {
    if (window.HeaderDomain && typeof window.HeaderDomain.init === "function") {
      window.HeaderDomain.init();
    }
    if (window.HeaderButtons && typeof window.HeaderButtons.init === "function") {
      window.HeaderButtons.init();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
