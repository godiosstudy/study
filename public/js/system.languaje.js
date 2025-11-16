// system.languaje.js – gestión básica de idioma (stub)
window.SystemLanguage = (function () {
  function getCurrent() {
    try {
      return document.documentElement.getAttribute("lang") || "es";
    } catch {
      return "es";
    }
  }

  function setCurrent(lang) {
    lang = lang || "es";
    try {
      document.documentElement.setAttribute("lang", lang);
    } catch {}
  }

  return {
    getCurrent: getCurrent,
    setCurrent: setCurrent,
  };
})();
