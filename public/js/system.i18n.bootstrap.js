// system.i18n.bootstrap.js – aplica traducciones básicas al DOM
(function () {
  function applyTranslations() {
    if (!window.SystemLanguage || !window.SystemTranslations) return;
    var lang = window.SystemLanguage.getCurrent();
    var dict = window.SystemTranslations[lang] || {};
    var nodes = document.querySelectorAll('[data-i18n]');
    nodes.forEach(function (node) {
      var key = node.getAttribute('data-i18n');
      if (!key) return;
      var value = dict[key];
      if (typeof value === 'string' && value.length) {
        node.textContent = value;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTranslations);
  } else {
    applyTranslations();
  }

  // Reaplicar cuando cambie el idioma desde preferencias
  window.addEventListener('i18n:changed', function () {
    applyTranslations();
  });
})();
