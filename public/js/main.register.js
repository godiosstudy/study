// main.register.js – stub de registro (versión 0.2.5 será más completa)
window.MainRegister = (function () {
  function render(container) {
    if (!container) return;
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "panel-single";

    wrap.innerHTML = [
      "<h1>Registrarse</h1>",
      '<p class="main-subtitle">Creación de cuenta para Study.GODiOS.org</p>',
      '<form class="form-vert" id="form-register">',
      '  <div class="form-group">',
      '    <label for="reg-email">Email</label>',
      '    <input type="email" id="reg-email" required />',
      "  </div>",
      '  <div class="form-group">',
      '    <label for="reg-password">Password</label>',
      '    <input type="password" id="reg-password" required />',
      "  </div>",
      '  <div class="form-actions">',
      '    <button type="submit" class="chip">Crear cuenta</button>',
      "  </div>",
      "</form>",
      '<p class="field-hint" id="reg-hint"></p>',
    ].join("\n");

    container.appendChild(wrap);

    var form = wrap.querySelector("#form-register");
    var hint = wrap.querySelector("#reg-hint");

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (hint) hint.textContent = "Registro aún no implementado (stub).";
    });
  }

  return { render: render };
})();
