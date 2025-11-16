// main.forget.js – recuperación de contraseña
window.MainForget = (function () {
  function render(container) {
    if (!container) return;
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "panel-single";

    wrap.innerHTML = [
      "<h1>Recuperar contraseña</h1>",
      '<p class="main-subtitle">Te enviaremos un enlace de recuperación</p>',
      '<form class="form-vert" id="form-forget">',
      '  <div class="form-group">',
      '    <label for="forget-email">Email</label>',
      '    <input type="email" id="forget-email" required />',
      "  </div>",
      '  <div class="form-actions">',
      '    <button type="submit" class="chip">Enviar enlace</button>',
      "  </div>",
      "</form>",
      '<p class="field-hint" id="forget-hint"></p>',
    ].join("\n");

    container.appendChild(wrap);

    var form = wrap.querySelector("#form-forget");
    var hint = wrap.querySelector("#forget-hint");

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (hint) hint.textContent = "Recuperación aún no implementada (stub).";
    });
  }

  return { render: render };
})();
