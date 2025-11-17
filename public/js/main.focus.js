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

      // Solapa de título: "Mateo 17:5"
    var pill = document.getElementById("view-title");
    if (pill && l4 && l5 && l6) {
      pill.textContent = l4 + " " + l5 + ": " + l6;
      pill.style.display = "inline-block";
    } else if (pill) {
      pill.textContent = lang === "en" ? "Focus" : "Focus";
      pill.style.display = "inline-block";
    }

    body.innerHTML = "";

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
  }

  return { render: render };
})();
