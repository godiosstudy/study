// toolbar.js – búsqueda principal y acciones del toolbar
window.Toolbar = (function () {
  function documentReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function initSearch() {
    var input = document.getElementById("tbar-search");
    if (!input) return;

    input.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter") return;
      ev.preventDefault();
      var query = input.value.trim();
      if (!window.Main || typeof window.Main.showView !== "function") return;
      window.Main.showView("results", { query: query });
    });
  }

  function init() {
    initSearch();
  }

  documentReady(init);

  return { init: init };
})();
