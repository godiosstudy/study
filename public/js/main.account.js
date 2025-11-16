// main.account.js – vista de cuenta de usuario (stub)
window.MainAccount = (function () {
  function render(container) {
    if (!container) return;
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "panel-single";

    var user =
      (window.AuthSession && window.AuthSession.getUser && window.AuthSession.getUser()) ||
      null;

    wrap.innerHTML = [
      "<h1>Mi cuenta</h1>",
      user
        ? '<p class="main-subtitle">Usuario: <strong>' +
          String(user.email || "") +
          "</strong></p>"
        : '<p class="main-subtitle">No hay usuario autenticado (stub).</p>',
    ].join("\n");

    container.appendChild(wrap);
  }

  return { render: render };
})();
