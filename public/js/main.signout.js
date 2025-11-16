// main.signout.js – cierre de sesión
window.MainSignout = (function () {
  function render(container) {
    if (!container) return;
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "panel-single";

    wrap.innerHTML = [
      "<h1>Cerrar sesión</h1>",
      '<p class="main-subtitle">Confirma que deseas salir de Study.GODiOS.org</p>',
      '<div class="form-actions">',
      '  <button type="button" class="chip" id="signout-confirm">Cerrar sesión</button>',
      "</div>",
      '<p class="field-hint" id="signout-hint"></p>',
    ].join("\n");

    container.appendChild(wrap);

    var btn = wrap.querySelector("#signout-confirm");
    var hint = wrap.querySelector("#signout-hint");

    btn.addEventListener("click", function () {
      if (window.AuthSession && typeof window.AuthSession.clear === "function") {
        window.AuthSession.clear();
      } else {
        localStorage.removeItem("auth.user");
      }
      if (hint) hint.textContent = "Sesión cerrada (stub).";
      if (window.HeaderButtons && typeof window.HeaderButtons.init === "function") {
        window.HeaderButtons.init();
      }
    });
  }

  return { render: render };
})();
