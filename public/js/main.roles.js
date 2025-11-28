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
    },
    en: {
      title: "Roles",
    },
  };

  function t(key) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || key;
  }

  function render(container) {
    if (!container) return;
    container.innerHTML = [
      '<div class="main-view-header">',
      '  <h1 class="main-view-title">' + t("title") + "</h1>",
      "</div>",
      "",
      '<div class="main-view-body">',
      '  <p>HELLO</p>',
      "</div>"
    ].join("\n");
  }

  return { render: render };
})();