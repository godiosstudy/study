// main.changelog.js – vista de changelog
window.MainChangelog = (function () {
  var VERSION_URL = "/config/version.json";

  function render(container) {
    if (!container) return;

    var wrap = document.createElement("div");
    wrap.className = "panel-single";
    wrap.innerHTML =
      '<h1>Changelog</h1>' +
      '<p class="main-subtitle">Historial de versiones de Study.GODiOS.org</p>' +
      '<div id="changelog-list">Cargando versiones…</div>';

    container.appendChild(wrap);

    var listEl = wrap.querySelector("#changelog-list");

    fetch(VERSION_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || !data.length) {
          listEl.textContent = "No hay información de versiones.";
          return;
        }

        var html = data
          .map(function (entry) {
            var notes = Array.isArray(entry.notes) ? entry.notes : [];
            var items = notes
              .map(function (n) {
                return "<li>" + String(n) + "</li>";
              })
              .join("");

            return (
              '<section class="chg-entry">' +
              "<h2>v" +
              String(entry.version) +
              (entry.date ? ' · <small>' + String(entry.date) + "</small>" : "") +
              "</h2>" +
              (items ? "<ul>" + items + "</ul>" : "") +
              "</section>"
            );
          })
          .join("");

        listEl.innerHTML = html;
      })
      .catch(function (err) {
        console.error("Error loading version.json", err);
        listEl.textContent = "No fue posible cargar el changelog.";
      });
  }

  return { render: render };
})();
