// main.roles.js – vista de Roles (placeholder)
window.MainRoles = (function () {
  function getLang() {
    try {
      var store = window.PrefsStore;
      if (store && typeof store.load === "function") {
        var prefs = store.load() || {};
        if (prefs && prefs.language) return prefs.language;
      }
    } catch (e) {}
    return "es";
  }


  var TEXTS = {
    es: {
      title: "Roles",
      comingSoon: "Pronto vas a poder administrar roles desde aquí.",
    },
    en: {
      title: "Roles",
      comingSoon: "Soon you will be able to manage roles here.",
    },
  };

  function t(key) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || key;
  }

  
  function render(container) {
    if (!container) return;

    container.innerHTML = "";
    container.className = "panel-single admin-panel";

    var wrap = document.createElement("div");
    wrap.className = "main-view";

    wrap.innerHTML = [
      '<div class="main-view-header">',
      '  <h1 class="main-view-title">' + t("title") + "</h1>",
      "</div>",
      '',
      '<div class="panel-body">',
      '  <p class="text-muted">' + t("comingSoon") + "</p>",
      "</div>"
    ].join("\n");

    container.appendChild(wrap);
  }

  return { render: render };

})();