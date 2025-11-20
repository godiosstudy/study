// main.focus.js – panel de contenido enfocado
window.MainFocus = (function () {
  function getPrefs() {
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === "function") {
        return window.PrefsStore.load() || {};
      }
    } catch (e) {}
    return {};
  }

  function getLang() {
    var prefs = getPrefs();
    return prefs.language || "es";
  }


  function render(container, options) {
    if (!container) return;

    var body = container;
    var lang = getLang();
    var opts = options || {};

    var l4 = opts.level_4 || "";
    var l5 = opts.level_5 || "";
    var l6 = opts.level_6 || "";
    var l7 = opts.level_7 || "";

    // Encabezado principal dentro del main (sin solapa invertida)
    var header = document.createElement("div");
    header.className = "main-view-header";

    var h1 = document.createElement("h1");
    h1.className = "main-view-title";

    if (l4 && l5 && l6) {
      h1.textContent = l4 + " " + l5 + ": " + l6;
    } else {
      h1.textContent = lang === "en" ? "Focus" : "Focus";
    }

    header.appendChild(h1);

    body.innerHTML = "";
    body.appendChild(header);

    // Versículo estrella (nivel 7)
    var content = document.createElement("div");
    content.className = "focus-main-text";

    if (l7) {
      content.textContent = l7;
    } else {
      content.textContent =
        lang === "en"
          ? "When you click an item in Navigation or Results, its Level 7 will appear here."
          : "Cuando hagas clic en un elemento de Navegación o Resultados, su Nivel 7 aparecerá aquí.";
    }

    body.appendChild(content);

    // Panel de control debajo del versículo (centrado)
    var actions = document.createElement("div");
    actions.className = "focus-actions";

    // Botón 'back' usando el mismo formato de iconos (Lucide) que el header
    var backBtn = document.createElement("button");
    backBtn.className = "focus-action-btn";
    var backIcon = document.createElement("i");
    backIcon.setAttribute("data-lucide", "arrow-left");
    backBtn.appendChild(backIcon);

    backBtn.title =
      lang === "en" ? "Back to chapter" : "Volver al capítulo completo";

    backBtn.addEventListener("click", function () {
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("navigator", {
          level_4: l4,
          level_5: l5,
        });
      }
    });

    actions.appendChild(backBtn);
    body.appendChild(actions);
  }

  return { render: render };
})();
