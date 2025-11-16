// main.results.js – resultados de búsqueda
window.MainResults = (function () {
  function render(container, options) {
    if (!container) return;
    var body =
      container.querySelector(".results-body") ||
      container.querySelector(".panel") ||
      container;

    var q = options && options.query ? String(options.query) : "";

    body.innerHTML =
      "<p>Resultados de búsqueda (stub)." +
      (q ? ' Query: <strong>"' + q.replace(/</g, "&lt;") + '"</strong>' : "") +
      "</p>";
  }

  return { render: render };
})();
