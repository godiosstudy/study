// main.forget.js – recuperación de contraseña
window.MainForget = (function () {
  
  function render(container) {
    if (!container) return;
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "panel panel-single register-panel";

    var html = [
      '<div class="main-view-header">',
      '  <h1 class="main-view-title" id="forget-title"></h1>',
      "</div>",
      '',
      '<div class="register-card">',
      '  <form class="form-vert" id="form-forget">',
      '    <div class="reg-field" data-field="email">',
      '      <input type="email" id="forget-email" autocomplete="email" />',
      '      <label for="forget-email" id="lbl-forget-email"></label>',
      '      <p class="field-hint" id="forget-hint"></p>',
      "    </div>",
      '    <div class="register-actions single">',
      '      <button type="submit" class="chip primary" id="forget-submit" disabled></button>',
      "    </div>",
      "  </form>",
      "</div>",
      "",
      '<p class="field-hint" id="forget-global-hint"></p>'
    ].join("\n");

    wrap.innerHTML = html;
    container.appendChild(wrap);

    applyTexts(wrap);
    wireLogic(wrap);
  }


  function getLang() {
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === "function") {
        var prefs = window.PrefsStore.load();
        if (prefs && prefs.language) return prefs.language;
      }
    } catch (e) {}
    return "es";
  }

  var TEXTS = {
    es: {
      title: "Recuperar contraseña",
      emailLabel: "Correo",
      emailRequired: "Debes ingresar un correo válido.",
      submit: "Enviar enlace",
      success: "Si el correo existe, te enviaremos un enlace para restablecer tu contraseña.",
      error: "No se pudo procesar la solicitud. Intenta nuevamente más tarde."
    },
    en: {
      title: "Reset password",
      emailLabel: "Email",
      emailRequired: "You must enter a valid email.",
      submit: "Send link",
      success: "If this email exists, we will send you a link to reset your password.",
      error: "We could not process your request. Please try again later."
    }
  };

  function t(key) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || key;
  }

  function applyTexts(root) {
    if (!root) return;
    var title = root.querySelector("#forget-title");
    var lblEmail = root.querySelector("#lbl-forget-email");
    var btnSubmit = root.querySelector("#forget-submit");
    var emailInput = root.querySelector("#forget-email");

    if (title) title.textContent = t("title");
    if (lblEmail) lblEmail.textContent = t("emailLabel");
    if (btnSubmit) btnSubmit.textContent = t("submit");
    if (emailInput) emailInput.setAttribute("placeholder", "");
  }

  function isValidEmail(email) {
    if (!email) return false;
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function wireLogic(root) {
    var form = root.querySelector("#form-forget");
    var emailInput = root.querySelector("#forget-email");
    var fieldHint = root.querySelector("#forget-hint");
    var globalHint = root.querySelector("#forget-global-hint");
    var submitBtn = root.querySelector("#forget-submit");

    function showHint(el, msg, kind) {
      if (!el) return;
      el.textContent = msg || "";
      el.className = "field-hint";
      if (kind === "error") el.classList.add("error");
      if (kind === "ok") el.classList.add("ok");
    }

    function markHasValue(inputEl) {
      if (!inputEl) return;
      var wrap = inputEl.closest(".reg-field");
      if (!wrap) return;
      var hasVal = !!inputEl.value;
      if (hasVal) wrap.classList.add("has-value");
      else wrap.classList.remove("has-value");
    }

    function clearHints() {
      showHint(fieldHint, "", null);
      showHint(globalHint, "", null);
    }

    function recomputeSubmitEnabled() {
      if (!submitBtn) return;
      var value = (emailInput && emailInput.value || "").trim();
      if (!value) {
        submitBtn.disabled = true;
        return;
      }
      submitBtn.disabled = !isValidEmail(value);
    }

    if (emailInput) {
      // Estado inicial sin placeholder visual
      emailInput.setAttribute("placeholder", "");
      markHasValue(emailInput);
      recomputeSubmitEnabled();

      emailInput.addEventListener("input", function () {
        markHasValue(emailInput);
        clearHints();
        recomputeSubmitEnabled();
      });

      emailInput.addEventListener("blur", function () {
        markHasValue(emailInput);
      });
    }

    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        clearHints();

        var email = (emailInput && emailInput.value || "").trim();
        if (!isValidEmail(email)) {
          showHint(fieldHint, t("emailRequired"), "error");
          recomputeSubmitEnabled();
          return;
        }

        // Stub: aquí se integrará el backend real
        showHint(fieldHint, "", null);
        showHint(globalHint, t("success"), "ok");
      });
    }

    window.addEventListener("i18n:changed", function () {
      applyTexts(root);
      // Reaplicar estados visuales si cambia el idioma
      if (emailInput) {
        markHasValue(emailInput);
        recomputeSubmitEnabled();
      }
    });
  }
  return { render: render };
})();
