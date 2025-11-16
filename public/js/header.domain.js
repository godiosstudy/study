// header.domain.js – gestiona el dominio/logo del header (lado izquierdo)
window.HeaderDomain = (function () {
  function goHome() {
    if (window.Main && typeof window.Main.showView === "function") {
      window.Main.showView("navigator");
    } else {
      window.location.href = "/";
    }
  }

  function wireClickable(el) {
    if (!el) return;
    el.style.cursor = "pointer";
    el.addEventListener("click", function (ev) {
      ev.preventDefault();
      goHome();
    });
  }

  function init() {
    var domain = document.getElementById("hdr-domain");
    var logo = document.querySelector(".logo");
    wireClickable(domain || logo);
  }

  return { init: init };
})();
