// footer.js – inicialización genérica del footer
(function () {
  function init() {
    if (window.FooterLogo && typeof window.FooterLogo.init === "function") {
      window.FooterLogo.init();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
