// footer.js – inicialización del footer + loader de corpus en el footer
(function () {
  function documentReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function getFooterWrap() {
    return document.getElementById("app-footer");
  }

  function ensureLoaderNode() {
    var wrap = getFooterWrap();
    if (!wrap) return null;

    var loader = wrap.querySelector(".ftr-loader");
    if (!loader) {
      loader = document.createElement("div");
      loader.className = "ftr-loader";

      var bar = document.createElement("div");
      bar.className = "ftr-loader-bar";
      bar.setAttribute("data-footer-loader-bar", "1");

      var textWrap = document.createElement("div");
      textWrap.className = "ftr-loader-text";

      var line1 = document.createElement("div");
      line1.className = "ftr-loader-line1";
      line1.setAttribute("data-footer-loader-line1", "1");

      var line2 = document.createElement("div");
      line2.className = "ftr-loader-line2";
      line2.setAttribute("data-footer-loader-line2", "1");

      textWrap.appendChild(line1);
      textWrap.appendChild(line2);

      loader.appendChild(bar);
      loader.appendChild(textWrap);

      wrap.appendChild(loader);
    }

    return loader;
  }

  var currentSnippet = "";

  var FooterLoader = {
    show: function (initialPct, snippet, lang) {
      var wrap = getFooterWrap();
      if (!wrap) return;

      ensureLoaderNode();
      wrap.classList.add("ftr-loading");

      var v = typeof initialPct === "number" ? initialPct : 0;
      this.setProgress(v, snippet || "", lang);
    },

    hide: function () {
      var wrap = getFooterWrap();
      if (!wrap) return;
      wrap.classList.remove("ftr-loading");
    },

    setProgress: function (pct, snippet, lang) {
      var wrap = getFooterWrap();
      if (!wrap) return;

      var loader = ensureLoaderNode();
      if (!loader) return;

      var bar = loader.querySelector("[data-footer-loader-bar]");
      var line1 = loader.querySelector("[data-footer-loader-line1]");
      var line2 = loader.querySelector("[data-footer-loader-line2]");

      var v = parseInt(pct, 10);
      if (isNaN(v)) v = 0;
      if (v < 0) v = 0;
      if (v > 100) v = 100;

      if (bar) {
        bar.style.width = v + "%";
      }

      // Determinar idioma para el texto "Cargando / Loading"
      var language = lang;
      if (!language) {
        try {
          if (window.PrefsStore && typeof window.PrefsStore.load === "function") {
            var p = window.PrefsStore.load() || {};
            language = p.language || "es";
          }
        } catch (ePrefs) {
          language = "es";
        }
      }

      var isEn = language === "en";
      var label = isEn ? "Loading" : "Cargando";

      if (line1) {
        line1.textContent = label + " " + v + "%";
      }

      if (typeof snippet === "string" && snippet) {
        currentSnippet = snippet;
      }
      if (line2) {
        line2.textContent = currentSnippet || "";
      }

      // Cambiar color del texto según qué tan avanzado va el llenado:
      // antes de 50% → texto oscuro, después → texto claro.
      var textColor = v < 50 ? "#111827" : "#ffffff";
      if (line1) line1.style.color = textColor;
      if (line2) line2.style.color = textColor;
    }
  };

  function init() {
    // Inicializar logo/versión como antes
    if (window.FooterLogo && typeof window.FooterLogo.init === "function") {
      window.FooterLogo.init();
    }

    // Exponer controlador global del loader
    window.FooterLoader = FooterLoader;
  }

  documentReady(init);
})();
