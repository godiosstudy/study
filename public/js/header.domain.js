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

  function isMobile() {
    if (typeof window === "undefined") return false;
    if (window.matchMedia) {
      try {
        return window.matchMedia("(max-width: 600px)").matches;
      } catch (e) {}
    }
    return window.innerWidth <= 600;
  }

  function isLoggedIn() {
    try {
      if (
        window.AuthSession &&
        typeof window.AuthSession.isLoggedIn === "function"
      ) {
        return window.AuthSession.isLoggedIn();
      }
    } catch (e) {}

    try {
      return !!localStorage.getItem("auth.user");
    } catch (e) {
      return false;
    }
  }

  function applyVisibility() {
    var domainEl = document.getElementById("hdr-domain");
    if (!domainEl) return;
    var hide = isMobile() && isLoggedIn();
    domainEl.style.display = hide ? "none" : "";
  }

  function init() {
    var domain = document.getElementById("hdr-domain");
    var logo = document.querySelector(".logo");
    wireClickable(domain || logo);
    applyVisibility();

    try {
      window.addEventListener("resize", applyVisibility);
      window.addEventListener("orientationchange", applyVisibility);
      window.addEventListener("auth:changed", function () {
        applyVisibility();
      });
    } catch (e) {}
  }

  return { init: init };
})();
