// footer.logo.js – versión + logo en el footer (derecha)
window.FooterLogo = (function () {
  var VERSION_URL = "/config/version.json";

  function documentReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function loadVersion(target) {
    fetch(VERSION_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || !data.length) return;
        var latest = data[0];
        if (!latest || !latest.version) return;
        target.textContent = "v" + String(latest.version);
      })
      .catch(function () {
        // fallback silencioso
      });
  }

  function init() {
    var versionEl = document.getElementById("footer-version");
    if (!versionEl) return;

    versionEl.style.cursor = "pointer";
    versionEl.textContent = "v0.2.4"; // fallback inmediato
    loadVersion(versionEl);

    versionEl.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("changelog");
      }
    });

    // el logo ya está en el DOM con id="ftr-logo"
  }

  documentReady(init);

  return { init: init };
})();
