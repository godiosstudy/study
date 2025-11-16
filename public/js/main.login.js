// main.login.js – inicio de sesión (stub)
window.MainLogin = (function () {
  function render(container) {
    if (!container) return;
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "panel-single";

    wrap.innerHTML = [
      "<h1>Iniciar sesión</h1>",
      '<p class="main-subtitle">Accede a tu cuenta</p>',
      '<form class="form-vert" id="form-login">',
      '  <div class="form-group">',
      '    <label for="login-email">Email</label>',
      '    <input type="email" id="login-email" required />',
      "  </div>",
      '  <div class="form-group">',
      '    <label for="login-password">Password</label>',
      '    <input type="password" id="login-password" required />',
      "  </div>",
      '  <div class="form-actions">',
      '    <button type="submit" class="chip">Entrar</button>',
      "  </div>",
      "</form>",
      '<p class="field-hint" id="login-hint"></p>',
    ].join("\n");

    container.appendChild(wrap);

    var form = wrap.querySelector("#form-login");
    var hint = wrap.querySelector("#login-hint");

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (hint) hint.textContent = "Login aún no implementado (stub).";
    });
  }

  return { render: render };
})();
