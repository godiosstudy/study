// main.forget.js – recuperación de contraseña por código
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
      '  <form class="form-vert" id="form-forget" novalidate>',
      '    <div id="forget-step-1">',
      '      <div class="reg-field" data-field="email">',
      '        <input type="email" id="forget-email" autocomplete="email" />',
      '        <label for="forget-email" id="lbl-forget-email"></label>',
      '        <p class="field-hint" id="forget-hint"></p>',
      "      </div>",
      '      <div class="register-actions single">',
      '        <button type="submit" class="chip primary" id="forget-submit" disabled></button>',
      "      </div>",
      "    </div>",
      '',
      '    <div id="forget-step-2" style="display:none">',
      '      <div class="reg-field" data-field="code">',
      '        <input type="text" id="forget-code" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" />',
      '        <label for="forget-code" id="lbl-forget-code"></label>',
      '      </div>',
      '      <div class="reg-field" data-field="password">',
      '        <input type="password" id="forget-pass-1" autocomplete="new-password" />',
      '        <label for="forget-pass-1" id="lbl-forget-pass-1"></label>',
      "      </div>",
      '      <div class="reg-field" data-field="password2">',
      '        <input type="password" id="forget-pass-2" autocomplete="new-password" />',
      '        <label for="forget-pass-2" id="lbl-forget-pass-2"></label>',
      '        <p class="field-hint" id="forget-step2-hint"></p>',
      "      </div>",
      '      <div class="register-actions single">',
      '        <button type="submit" class="chip primary" id="forget-step2-submit"></button>',
      "      </div>",
      "    </div>",
      '',
      '    <p class="register-login-link"><span id="forget-login-link" class="link-like"></span></p>',
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

  // Igual que en Register: idioma desde preferencias
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
      title: "Contraseña",
      emailLabel: "Usuario o correo",
      emailRequired: "Debes ingresar un usuario o correo válido.",
      submitStep1: "Enviar código",
      codeLabel: "Código de verificación",
      pass1Label: "Nueva contraseña",
      pass2Label: "Repite la nueva contraseña",
      passRequired: "Debes ingresar una contraseña válida.",
      passMismatch: "Las contraseñas no coinciden.",
      passTooShort: "La contraseña debe tener al menos 8 caracteres.",
      submitStep2: "Cambiar contraseña",
      successStep1: "Te enviamos un código de verificación a tu correo (si existe en el sistema).",
      successStep2: "Contraseña actualizada. Ahora puedes iniciar sesión con la nueva contraseña.",
      codeInvalid: "El código ingresado no es válido o ya ha vencido.",
      error: "No se pudo procesar la solicitud. Intenta nuevamente más tarde.",
      backToLogin: "Recordaste tu contraseña, inicia sesión !!!"
    },
    en: {
      title: "Password",
      emailLabel: "Username or email",
      emailRequired: "You must enter a valid username or email.",
      submitStep1: "Send code",
      codeLabel: "Verification code",
      pass1Label: "New password",
      pass2Label: "Repeat new password",
      passRequired: "You must enter a valid password.",
      passMismatch: "Passwords do not match.",
      passTooShort: "Password must be at least 8 characters.",
      submitStep2: "Change password",
      successStep1: "We sent a verification code to your email (if it exists in our system).",
      successStep2: "Password updated. You can now sign in with your new password.",
      codeInvalid: "The verification code is invalid or has expired.",
      error: "We could not process your request. Please try again later.",
      backToLogin: "Remembered your password? Sign in !!!"
    }
  };

  function t(key) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || key;
  }

  // RPC para ENVIAR el código por correo
  async function sendResetCode(email) {
    if (
      !window.BackendSupabase ||
      typeof window.BackendSupabase.client !== "function" ||
      typeof window.BackendSupabase.isConfigured !== "function" ||
      !window.BackendSupabase.isConfigured()
    ) {
      return { ok: false, error: "not_configured" };
    }
    var client = window.BackendSupabase.client();
    if (!client) return { ok: false, error: "no_client" };

    try {
      var payload = { p_email: email, p_lang: getLang() };
      var res = await client.rpc("auth_send_reset_password", payload);
      if (res && res.error) {
        console.warn("[Forget] auth_send_reset_password error", res.error);
        return { ok: false, error: res.error.message || "rpc_error" };
      }
      return { ok: true };
    } catch (e) {
      console.warn("[Forget] sendResetCode exception", e);
      return { ok: false, error: "exception" };
    }
  }

  // RPC que VERIFICA código y CAMBIA la contraseña
  async function confirmResetPassword(email, code, newPassword) {
    if (
      !window.BackendSupabase ||
      typeof window.BackendSupabase.client !== "function" ||
      typeof window.BackendSupabase.isConfigured !== "function" ||
      !window.BackendSupabase.isConfigured()
    ) {
      return { ok: false, error: "not_configured" };
    }
    var client = window.BackendSupabase.client();
    if (!client) return { ok: false, error: "no_client" };

    try {
      var payload = { p_email: email, p_code: code, p_new_password: newPassword };
      var res = await client.rpc("auth_reset_verify_code", payload);
      // Si el RPC devuelve un error explícito, lo tratamos como fallo.
      if (res && res.error) {
        console.warn("[Forget] auth_reset_verify_code error", res.error);
        return { ok: false, error: res.error.message || "rpc_error" };
      }
      // En versiones anteriores la función devolvía un valor en data (true/false).
      // Si data está definido, lo usamos para determinar si el código es válido.
      if (res && typeof res.data !== "undefined" && res.data !== null) {
        var isValidFlag = !!res.data;
        return { ok: isValidFlag, error: isValidFlag ? null : "invalid" };
      }
      // Si no hay error y tampoco hay data (función VOID), asumimos que todo fue bien.
      return { ok: true, error: null };
    } catch (e) {
      console.warn("[Forget] confirmResetPassword exception", e);
      return { ok: false, error: "exception" };
    }
  }

  function applyTexts(root) {
    if (!root) return;
    var title = root.querySelector("#forget-title");
    var lblEmail = root.querySelector("#lbl-forget-email");
    var lblCode = root.querySelector("#lbl-forget-code");
    var lblPass1 = root.querySelector("#lbl-forget-pass-1");
    var lblPass2 = root.querySelector("#lbl-forget-pass-2");
    var btnStep1 = root.querySelector("#forget-submit");
    var btnStep2 = root.querySelector("#forget-step2-submit");
    var backLink = root.querySelector("#forget-login-link");

    if (title) title.textContent = t("title");
    if (lblEmail) lblEmail.textContent = t("emailLabel");
    if (lblCode) lblCode.textContent = t("codeLabel");
    if (lblPass1) lblPass1.textContent = t("pass1Label");
    if (lblPass2) lblPass2.textContent = t("pass2Label");
    if (btnStep1) btnStep1.textContent = t("submitStep1");
    if (btnStep2) btnStep2.textContent = t("submitStep2");
    if (backLink) backLink.textContent = t("backToLogin");
  }

  function isValidEmail(email) {
    if (!email) return false;
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function wireLogic(root) {
    var form = root.querySelector("#form-forget");
    var step1 = root.querySelector("#forget-step-1");
    var step2 = root.querySelector("#forget-step-2");

    var emailInput = root.querySelector("#forget-email");
    var codeInput = root.querySelector("#forget-code");
    var pass1Input = root.querySelector("#forget-pass-1");
    var pass2Input = root.querySelector("#forget-pass-2");

    var fieldHint = root.querySelector("#forget-hint");
    var step2Hint = root.querySelector("#forget-step2-hint");
    var globalHint = root.querySelector("#forget-global-hint");

    var btnStep1 = root.querySelector("#forget-submit");
    var btnStep2 = root.querySelector("#forget-step2-submit");
    var backLink = root.querySelector("#forget-login-link");

    var currentStep = 1;
    var savedEmail = "";

    function showHint(el, msg, kind) {
      if (!el) return;
      el.textContent = msg || "";
      el.className = "field-hint";
      if (kind === "error") el.classList.add("error");
      if (kind === "ok") el.classList.add("ok");

      // También mostramos los mensajes globales en el header
      try {
        if (
          typeof globalHint !== "undefined" &&
          el === globalHint &&
          msg &&
          window.HeaderMessages &&
          typeof window.HeaderMessages.show === "function"
        ) {
          var opts = { duration: 7000 };
          if (kind === "error") opts.type = "error";
          else if (kind === "ok") opts.type = "success";
          window.HeaderMessages.show(msg, opts);
        }
      } catch (e) {}
    }

    function markHasValue(inputEl) {
      if (!inputEl) return;
      var wrap = inputEl.closest(".reg-field");
      if (!wrap) return;
      var hasVal = !!inputEl.value;
      if (hasVal) wrap.classList.add("has-value");
      else wrap.classList.remove("has-value");
    }

    function clearAllHints() {
      showHint(fieldHint, "", null);
      showHint(step2Hint, "", null);
      showHint(globalHint, "", null);
    }

    function gotoStep2() {
      currentStep = 2;
      if (step1) step1.style.display = "none";
      if (step2) step2.style.display = "";
      if (btnStep2) btnStep2.disabled = false;
      if (codeInput) codeInput.focus();
    }

    function recomputeStep1Enabled() {
      if (!btnStep1) return;
      var v = (emailInput && emailInput.value || "").trim();
      btnStep1.disabled = !isValidEmail(v);
    }

    function recomputeStep2Enabled() {
      if (!btnStep2) return;
      var code = (codeInput && codeInput.value || "").trim();
      var p1 = (pass1Input && pass1Input.value || "").trim();
      var p2 = (pass2Input && pass2Input.value || "").trim();
      btnStep2.disabled = !code || !p1 || !p2;
    }

    if (emailInput) {
      emailInput.setAttribute("placeholder", "");
      markHasValue(emailInput);
      recomputeStep1Enabled();

      emailInput.addEventListener("input", function () {
        markHasValue(emailInput);
        clearAllHints();
        recomputeStep1Enabled();
      });
      emailInput.addEventListener("blur", function () {
        markHasValue(emailInput);
      });
    }

    if (codeInput) {
      codeInput.addEventListener("input", function () {
        markHasValue(codeInput);
        clearAllHints();
        recomputeStep2Enabled();
      });
    }
    if (pass1Input) {
      pass1Input.addEventListener("input", function () {
        markHasValue(pass1Input);
        clearAllHints();
        recomputeStep2Enabled();
      });
    }
    if (pass2Input) {
      pass2Input.addEventListener("input", function () {
        markHasValue(pass2Input);
        clearAllHints();
        recomputeStep2Enabled();
      });
    }

    if (backLink) {
      backLink.addEventListener("click", function () {
        try {
          if (window.Router && typeof window.Router.go === "function") {
            window.Router.go("login");
          } else if (window.Main && typeof window.Main.showView === "function") {
            window.Main.showView("login");
          } else if (window.MainLogin && typeof window.MainLogin.render === "function") {
            var main = document.getElementById("app-main");
            window.MainLogin.render(main);
          }
        } catch (e) {
          console.warn("[Forget] backToLogin navigation error", e);
        }
      });
    }

    if (form) {
      form.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        clearAllHints();

        if (currentStep === 1) {
          var email = (emailInput && emailInput.value || "").trim();
          if (!isValidEmail(email)) {
            showHint(fieldHint, t("emailRequired"), "error");
            recomputeStep1Enabled();
            return;
          }

          btnStep1.disabled = true;
          var res1 = await sendResetCode(email);
          if (!res1 || !res1.ok) {
            showHint(globalHint, t("error"), "error");
          } else {
            savedEmail = email;
            showHint(fieldHint, "", null);
            showHint(globalHint, t("successStep1"), "ok");
            gotoStep2();
          }
          recomputeStep1Enabled();
        } else {
          var code = (codeInput && codeInput.value || "").trim();
          var p1 = (pass1Input && pass1Input.value || "").trim();
          var p2 = (pass2Input && pass2Input.value || "").trim();

          if (!code) {
            showHint(step2Hint, t("codeLabel"), "error");
            recomputeStep2Enabled();
            return;
          }
          if (!p1 || !p2) {
            showHint(step2Hint, t("passRequired"), "error");
            recomputeStep2Enabled();
            return;
          }
          if (p1.length < 8) {
            showHint(step2Hint, t("passTooShort"), "error");
            recomputeStep2Enabled();
            return;
          }
          if (p1 !== p2) {
            showHint(step2Hint, t("passMismatch"), "error");
            recomputeStep2Enabled();
            return;
          }

          btnStep2.disabled = true;
          var res2 = await confirmResetPassword(savedEmail, code, p1);
          if (!res2 || !res2.ok) {
            if (res2 && res2.error === "invalid") {
              // Código incorrecto o vencido
              showHint(step2Hint, t("codeInvalid"), "error");
            } else {
              showHint(globalHint, t("error"), "error");
            }
          } else {
            showHint(step2Hint, "", null);
            showHint(globalHint, t("successStep2"), "ok");
            try {
              setTimeout(function () {
                if (window.Router && typeof window.Router.go === "function") {
                  window.Router.go("login");
                } else if (window.Main && typeof window.Main.showView === "function") {
                  window.Main.showView("login");
                }
              }, 2000);
            } catch (e) {}
          }
          recomputeStep2Enabled();
        }
      });
    }

    window.addEventListener("i18n:changed", function () {
      applyTexts(root);
      if (emailInput) {
        markHasValue(emailInput);
        recomputeStep1Enabled();
      }
      if (codeInput) markHasValue(codeInput);
      if (pass1Input) markHasValue(pass1Input);
      if (pass2Input) markHasValue(pass2Input);
    });
  }

  return { render: render };
})();
