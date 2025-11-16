// main.navigator.js – columna de navegación (layout de estudio)
window.MainNavigator = (function () {
  function ensureLayout(container) {
    if (!container) return null;

    var root = container.querySelector(".main-layout-study");
    if (root) {
      return {
        root: root,
        nav: root.querySelector('[data-panel="nav"]'),
        results: root.querySelector('[data-panel="results"]'),
        focus: root.querySelector('[data-panel="focus"]'),
      };
    }

    root = document.createElement("div");
    root.className = "main-layout-study";

    root.innerHTML = [
      '<div class="grid">',
      '  <section class="panel" data-panel="nav">',
      "    <h2>Navigation</h2>",
      '    <div class="nav-body">Navegación pendiente de implementar.</div>',
      "  </section>",
      '  <section class="panel" data-panel="results">',
      "    <h2>Search Results</h2>",
      '    <div class="results-body"></div>',
      "  </section>",
      '  <section class="panel" data-panel="focus">',
      "    <h2>Focus</h2>",
      '    <div class="focus-body"></div>',
      "  </section>",
      "</div>",
    ].join("\n");

    container.innerHTML = "";
    container.appendChild(root);

    return {
      root: root,
      nav: root.querySelector('[data-panel="nav"]'),
      results: root.querySelector('[data-panel="results"]'),
      focus: root.querySelector('[data-panel="focus"]'),
    };
  }

  function renderNav(navContainer) {
    if (!navContainer) return;
    var body = navContainer.querySelector(".nav-body");
    if (!body) return;
    body.textContent = "Aquí irá el árbol de navegación / índices (stub).";
  }

  return {
    ensureLayout: ensureLayout,
    renderNav: renderNav,
  };
})();
