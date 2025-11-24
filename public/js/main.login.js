// main.login.js – Iniciar sesión con Supabase
// Al iniciar sesión: carga preferencias desde profiles y las aplica al sistema.
// Si el perfil no tiene preferencias, se guardan las actuales del sitio en profiles.
// p_color en SQL = HEX sin #; en prefs usamos colorHex con #.
window.MainLogin = (function () {
  function getLang() {
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === "function") {
        var prefs = window.PrefsStore.load();
        if (prefs && prefs.language) return prefs.language;
      }
    } catch (e) {}
    return "es";
  }

  // Helpers de mapeo coherentes con main.preferences.js
  function sqlLanguage(lang) {
    if (!lang) return "es";
    return String(lang);
  }

  // HEX sin # en SQL
  function sqlColorFromPrefs(prefs) {
    if (!prefs || !prefs.colorHex) return null;
    var v = String(prefs.colorHex).trim();
    if (!v) return null;
    if (v[0] === "#") v = v.slice(1);
    v = v.toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(v)) return null;
    return v;
  }

  function sqlFontType(font) {
    if (!font) return null;
    return String(font);
  }

  function sqlFontSize(fontSizePt) {
    var n = parseInt(fontSizePt, 10);
    if (isNaN(n)) n = 12;
    if (n < 8) n = 8;
    if (n > 25) n = 25;
    return n;
  }

  function ptFromSqlFontSize(v) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return 12;
    if (n < 8) n = 8;
    if (n > 25) n = 25;
    return n;
  }

  var TEXTS = {
  es: {
    title: "Iniciar sesión",
    identifierLabel: "Usuario o correo",
    identifierPlaceholder: "Usuario o correo",
    passwordLabel: "Contraseña",
    passwordPlaceholder: "Contraseña",
    btnCancel: "Cancelar",
    submit: "Iniciar sesión",
    forgotLink: "¿Olvidaste tu contraseña?",

    errorIdentifierRequired: "Debes ingresar tu usuario o correo.",
    errorRequired: "Debes ingresar tu usuario/correo y contraseña.",
    errorGeneric: "No fue posible iniciar sesión. Verifica tus datos.",
    errorInvalidCredentials: "Usuario/correo o contraseña incorrectos.",
    identifierChecking: "Buscando usuario…",
    identifierNotFound: "No encontramos este usuario.",
    identifierError: "No pudimos comprobar el usuario. Inténtalo de nuevo.",

    welcomePrefix: "Bienvenido, ",
    prefsFromUser:
      " Se han aplicado en este sitio las preferencias guardadas en tu cuenta.",
    prefsFromSite:
      " Hemos guardado en tu cuenta las preferencias actuales de este sitio.",
  },
  en: {
    title: "Sign in",
    identifierLabel: "Email or username",
    identifierPlaceholder: "Email or username",
    passwordLabel: "Password",
    passwordPlaceholder: "Password",
    btnCancel: "Cancel",
    submit: "Sign in",
    forgotLink: "Forgot your password?",

    errorIdentifierRequired: "You must enter your email or username.",
    errorRequired: "Please enter your email/username and password.",
    errorGeneric: "Could not sign you in. Please check your details.",
    errorInvalidCredentials: "Invalid email/username or password.",
    identifierChecking: "Looking for your account…",
    identifierNotFound: "We couldn't find this user.",
    identifierError: "We couldn't verify this account. Please try again.",

    welcomePrefix: "Welcome, ",
    prefsFromUser:
      " Your saved preferences have been applied to this site.",
    prefsFromSite:
      " Your current site preferences have been saved to your account.",
  },
};
  function t(key) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || key;
  }

  function getCurrentUserName() {
    try {
      if (window.AuthSession && typeof window.AuthSession.getUser === "function") {
        var u = window.AuthSession.getUser();
        if (!u) return "";
        var meta = u.user_metadata || {};
        if (meta.first_name) return meta.first_name;
        if (meta.last_name) return meta.last_name;
        if (u.email) return u.email.split("@")[0];
      }
    } catch (e) {}
    return "";
  }

  function buildWelcomeMessage(name, syncMode) {
    var mode = (syncMode && syncMode.mode) || syncMode || "none";
    var msg = t("welcomePrefix") + (name || "");
    if (mode === "siteFromUser") msg += t("prefsFromUser");
    else if (mode === "userFromSite") msg += t("prefsFromSite");
    return msg;
  }

  // Sincroniza preferencias entre sitio (PrefsStore) y perfil Supabase
  async function syncPreferencesOnLogin() {
    var result = { mode: "none" };

    try {
      if (
        !window.BackendSupabase ||
        typeof window.BackendSupabase.client !== "function" ||
        typeof window.BackendSupabase.isConfigured !== "function" ||
        !window.BackendSupabase.isConfigured()
      ) {
        return result;
      }

      if (
        !window.AuthSession ||
        typeof window.AuthSession.getUser !== "function"
      ) {
        return result;
      }

      var user = window.AuthSession.getUser();
      if (!user || !user.id) return result;

      var client = window.BackendSupabase.client();
      if (!client) return result;

      var store = window.PrefsStore;
      var sitePrefs =
        (store && typeof store.load === "function" && store.load()) ||
        (store && store.DEFAULTS) ||
        {};

      // 1) Leemos perfil para ver si tiene preferencias
      var profileRow = null;
      try {
        var res = await client
          .from("profiles")
          .select(
            "id, email, first_name, last_name, p_color, p_font_type, p_font_size, p_light, p_language, p_level_1, p_level_2"
          )
          .eq("id", user.id);

        if (!res.error && res.data && res.data.length) {
          profileRow = res.data[0];
        }
      } catch (e) {
        console.warn("[Login] profiles select error", e);
      }

      var hasUserPrefs =
        !!(
          profileRow &&
          (profileRow.p_color ||
            profileRow.p_font_type ||
            profileRow.p_font_size ||
            profileRow.p_language ||
            profileRow.p_level_1 ||
            profileRow.p_level_2 ||
            typeof profileRow.p_light === "boolean")
        );

      if (hasUserPrefs) {
        // 2a) El usuario YA tiene preferencias → aplicamos TODAS al sitio
        var merged = {};
        for (var k in sitePrefs) {
          if (Object.prototype.hasOwnProperty.call(sitePrefs, k)) {
            merged[k] = sitePrefs[k];
          }
        }

        if (profileRow.p_language) merged.language = profileRow.p_language;
        if (profileRow.p_font_type) merged.font = profileRow.p_font_type;
        if (profileRow.p_font_size != null) {
          merged.fontSizePt = ptFromSqlFontSize(profileRow.p_font_size);
        }
        if (typeof profileRow.p_light === "boolean") {
          merged.light = profileRow.p_light ? "on" : "off";
        }

        // p_color = HEX sin # → lo usamos para colorHex con #
        if (profileRow.p_color) {
          var hex = String(profileRow.p_color).trim();
          if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
            merged.colorHex = "#" + hex.toUpperCase();
          }
        }

        if (profileRow.p_level_1) merged.collection = profileRow.p_level_1;
        if (profileRow.p_level_2) merged.corpus = profileRow.p_level_2;

        sitePrefs = merged;

        if (store && typeof store.save === "function") {
          store.save(sitePrefs);
        }
        if (store && typeof store.apply === "function") {
          store.apply(sitePrefs);
        }

        result.mode = "siteFromUser";
      } else {
        // 2b) El usuario NO tiene preferencias → guardamos las del sitio en su perfil
        var lang = sqlLanguage(sitePrefs.language);
        var pColor = sqlColorFromPrefs(sitePrefs);
        var pFontType = sqlFontType(sitePrefs.font);
        var pFontSize = sqlFontSize(sitePrefs.fontSizePt);

        var payload = {
          id: user.id,
          email: user.email || null,
          first_name:
            (user.user_metadata && user.user_metadata.first_name) || null,
          last_name:
            (user.user_metadata && user.user_metadata.last_name) || null,
          p_language: lang,
          p_color: pColor,
          p_font_type: pFontType,
          p_font_size: pFontSize,
          p_light: sitePrefs.light === "on",
          p_level_1: sitePrefs.collection || null,
          p_level_2: sitePrefs.corpus || null,
        };

        try {
          var up = await client.from("profiles").upsert(payload);
          if (up && up.error) {
            console.warn("[Login] profiles upsert error", up.error);
          } else {
            result.mode = "userFromSite";
          }
        } catch (e) {
          console.warn("[Login] profiles upsert exception", e);
        }
      }
    } catch (e) {
      console.warn("[Login] syncPreferencesOnLogin failed", e);
      if (!result.mode) result.mode = "error";
    }

    return result;
  }

  // =========================
  // UI
  // =========================

  function isEmailLike(value) {
    if (!value) return false;
    var v = String(value).trim();
    return v.includes("@") && v.indexOf("@") > 0 && v.indexOf("@") < v.length - 3;
  }

  async function lookupProfileByIdentifier(identifier) {
    identifier = (identifier || "").trim();
    if (!identifier) {
      return { ok: false, exists: null, email: null, username: null };
    }

    if (
      !window.BackendSupabase ||
      typeof window.BackendSupabase.client !== "function" ||
      typeof window.BackendSupabase.isConfigured !== "function" ||
      !window.BackendSupabase.isConfigured()
    ) {
      return { ok: false, exists: null, email: null, username: null };
    }

    var client = window.BackendSupabase.client();
    if (!client) {
      return { ok: false, exists: null, email: null, username: null };
    }

    var isEmail = isEmailLike(identifier);
    var value = identifier.toLowerCase();

    try {
      var query = client.from("profiles").select("email, p_username").limit(1);
      if (isEmail) {
        query = query.eq("email", value);
      } else {
        query = query.eq("p_username", value);
      }

      var res;
      if (query && typeof query.maybeSingle === "function") {
        res = await query.maybeSingle();
        if (res.error) {
          console.warn("[Login] identifier lookup error", res.error);
          return { ok: false, exists: null, email: null, username: null };
        }
        if (res.data) {
          return {
            ok: true,
            exists: true,
            email: res.data.email || null,
            username: res.data.p_username || null,
          };
        }
        return { ok: true, exists: false, email: null, username: null };
      } else {
        res = await query;
        if (res.error) {
          console.warn("[Login] identifier lookup error", res.error);
          return { ok: false, exists: null, email: null, username: null };
        }
        if (Array.isArray(res.data) && res.data.length > 0) {
          var row = res.data[0] || {};
          return {
            ok: true,
            exists: true,
            email: row.email || null,
            username: row.p_username || null,
          };
        }
        return { ok: true, exists: false, email: null, username: null };
      }
    } catch (e) {
      console.warn("[Login] identifier lookup exception", e);
      return { ok: false, exists: null, email: null, username: null };
    }
  }

  // Limpia el MAIN y muestra el mensaje de bienvenida (saltamos directo a navigator)
  function showWelcomeInMain(syncMode) {
    if (window.Main && typeof window.Main.showView === "function") {
      window.Main.showView("navigator");
    }
  }

  function render(container) {
    if (!container) return;
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "panel panel-single register-panel";

    wrap.innerHTML = [
      '<div class="main-view-header">',
      '  <h1 class="main-view-title" id="login-title"></h1>',
      "</div>",
      "",
      '<div class="register-card">',
      '  <form id="form-login" novalidate>',
      '    <div class="register-step" id="login-step-1">',
      '      <div class="reg-field" data-field="identifier">',
      '        <input type="text" id="login-identifier" autocomplete="username email" />',
      '        <label for="login-identifier" id="lbl-login-identifier"></label>',
      '        <p class="field-hint" id="login-identifier-hint"></p>',
      "      </div>",
      '      <div class="reg-field" data-field="password">',
      '        <input type="password" id="login-password" autocomplete="current-password" />',
      '        <label for="login-password" id="lbl-login-password"></label>',
      '        <p class="field-hint" id="login-password-hint"></p>',
      "      </div>",
      '      <div class="register-actions two">',
      '        <button type="button" class="chip" id="login-btn-cancel"></button>',
      '        <button type="submit" class="chip primary" id="login-submit" disabled></button>',
      "      </div>",
      '      <p class="register-login-link"><span id="login-forgot-link" class="link-like"></span></p>',
      "    </div>",
      "  </form>",
      "</div>",
      "",
      '<p class="field-hint" id="login-hint"></p>',
    ].join("\n");

    container.appendChild(wrap);

    applyTexts(wrap);
    wireLogic(wrap);
  }

  function applyTexts(root) {
    var titleEl = root.querySelector("#login-title");
    var idLabel = root.querySelector("#lbl-login-identifier");
    var passLabel = root.querySelector("#lbl-login-password");
    var cancelBtn = root.querySelector("#login-btn-cancel");
    var submitBtn = root.querySelector("#login-submit");
    var forgotLink = root.querySelector("#login-forgot-link");

    if (titleEl) titleEl.textContent = t("title");
    if (idLabel) idLabel.textContent = t("identifierLabel");
    if (passLabel) passLabel.textContent = t("passwordLabel");
    if (cancelBtn) cancelBtn.textContent = t("btnCancel");
    if (submitBtn) submitBtn.textContent = t("submit");
    if (forgotLink) forgotLink.textContent = t("forgotLink");

    var idInput = root.querySelector("#login-identifier");
    var passInput = root.querySelector("#login-password");
    if (idInput) idInput.setAttribute("placeholder", "");
    if (passInput) passInput.setAttribute("placeholder", "");

    var hint = root.querySelector("#login-hint");
    if (hint) {
      hint.textContent = "";
      hint.classList.remove("error", "ok");
    }
  }

  function wireLogic(root) {
    var form = root.querySelector("#form-login");
    var idEl = root.querySelector("#login-identifier");
    var passwordEl = root.querySelector("#login-password");
    var submitBtn = root.querySelector("#login-submit");
    var cancelBtn = root.querySelector("#login-btn-cancel");
    var idHint = root.querySelector("#login-identifier-hint");
    var globalHint = root.querySelector("#login-hint");
    var forgotLink = root.querySelector("#login-forgot-link");

    var state = {
      identifier: "",
      emailForAuth: null,
      idStatus: "empty", // empty | checking | ok | notfound | error
      password: "",
      isBusy: false,
    };

    function setFieldError(fieldEl, hasError) {
      if (!fieldEl) return;
      if (hasError) fieldEl.classList.add("error");
      else fieldEl.classList.remove("error");
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
      if (idHint) {
        idHint.textContent = "";
        idHint.classList.remove("error", "ok");
      }
      if (globalHint) {
        globalHint.textContent = "";
        globalHint.classList.remove("error", "ok");
      }
    }

    function showHint(el, text, variant) {
      if (!el) return;
      el.textContent = text || "";
      el.classList.remove("error", "ok");
      if (variant === "error") el.classList.add("error");
      if (variant === "ok") el.classList.add("ok");
    }

    function recomputeSubmitEnabled() {
      if (!submitBtn) return;
      var canSubmit =
        !!state.identifier &&
        !!state.password &&
        state.idStatus === "ok" &&
        !state.isBusy;
      submitBtn.disabled = !canSubmit;
    }

    function setBusy(isBusy) {
      state.isBusy = !!isBusy;
      if (submitBtn) {
        submitBtn.textContent = isBusy ? "…" : t("submit");
      }
      recomputeSubmitEnabled();
    }

    async function validateIdentifierIfNeeded() {
      var value = (idEl && idEl.value ? idEl.value : "").trim();
      state.identifier = value;
      state.emailForAuth = null;

      if (!value) {
        state.idStatus = "empty";
        setFieldError(idEl && idEl.closest(".reg-field"), false);
        if (idHint) {
          idHint.textContent = "";
          idHint.classList.remove("error", "ok");
        }
        recomputeSubmitEnabled();
        return;
      }

      state.idStatus = "checking";
      if (idHint) {
        showHint(idHint, t("identifierChecking"));
      }
      setFieldError(idEl && idEl.closest(".reg-field"), false);
      recomputeSubmitEnabled();

      var current = value;
      var lookup = await lookupProfileByIdentifier(current);
      if ((idEl && (idEl.value || "").trim()) !== current) {
        // usuario cambió el texto mientras se consultaba
        return;
      }

      if (!lookup || lookup.exists === null) {
        state.idStatus = "error";
        state.emailForAuth = null;
        setFieldError(idEl && idEl.closest(".reg-field"), true);
        showHint(idHint, t("identifierError"), "error");
      } else if (!lookup.exists) {
        state.idStatus = "notfound";
        state.emailForAuth = null;
        setFieldError(idEl && idEl.closest(".reg-field"), true);
        showHint(idHint, t("identifierNotFound"), "error");
      } else {
        state.idStatus = "ok";
        state.emailForAuth =
          lookup.email ||
          (isEmailLike(current) ? current.toLowerCase() : null);
        setFieldError(idEl && idEl.closest(".reg-field"), false);
        if (idHint) {
          idHint.textContent = "";
          idHint.classList.remove("error", "ok");
        }
      }

      recomputeSubmitEnabled();
    }

    if (idEl) {
      markHasValue(idEl);
      idEl.addEventListener("input", function () {
        state.identifier = (idEl.value || "").trim();
        state.idStatus = state.identifier ? "dirty" : "empty";
        state.emailForAuth = null;
        setFieldError(idEl.closest(".reg-field"), false);
        markHasValue(idEl);
        if (idHint) {
          idHint.textContent = "";
          idHint.classList.remove("error", "ok");
        }
        recomputeSubmitEnabled();
      });

      idEl.addEventListener("blur", function () {
        validateIdentifierIfNeeded();
      });
    }

    if (passwordEl) {
      markHasValue(passwordEl);
      passwordEl.addEventListener("input", function () {
        state.password = passwordEl.value || "";
        markHasValue(passwordEl);
        recomputeSubmitEnabled();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        if (window.Main && typeof window.Main.showView === "function") {
          window.Main.showView("navigator");
        }
      });
    }

    if (forgotLink) {
      forgotLink.addEventListener("click", function () {
        if (window.Router && typeof window.Router.go === "function") {
          window.Router.go("forget");
        } else if (window.MainForget && typeof window.MainForget.render === "function") {
          var cont = document.getElementById("app-main");
          window.MainForget.render(cont);
        }
      });
    }

    if (form) {
      form.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        clearHints();

        if (!idEl || !passwordEl) return;

        state.identifier = (idEl.value || "").trim();
        state.password = passwordEl.value || "";

        if (!state.identifier) {
          showHint(globalHint, t("errorIdentifierRequired"), "error");
          return;
        }
        if (!state.password) {
          showHint(globalHint, t("errorRequired"), "error");
          return;
        }

        if (state.idStatus !== "ok" || !state.emailForAuth) {
          await validateIdentifierIfNeeded();
          if (state.idStatus !== "ok" || !state.emailForAuth) {
            // si sigue sin ser válido, no continuamos
            if (state.idStatus === "notfound") {
              showHint(globalHint, t("identifierNotFound"), "error");
            } else if (state.idStatus === "error") {
              showHint(globalHint, t("identifierError"), "error");
            } else {
              showHint(globalHint, t("errorIdentifierRequired"), "error");
            }
            return;
          }
        }

        var email = state.emailForAuth;
        var password = state.password;

        setBusy(true);
        if (window.SystemLoader && typeof window.SystemLoader.show === "function") {
          window.SystemLoader.show();
        }

        try {
          if (
            !window.BackendSupabase ||
            typeof window.BackendSupabase.signIn !== "function"
          ) {
            throw new Error("[Supabase] Backend not available.");
          }

          await window.BackendSupabase.signIn({
            email: email,
            password: password,
          });

          var syncResult = await syncPreferencesOnLogin();
          var syncMode = (syncResult && syncResult.mode) || "none";

          if (form) form.reset();
          state.identifier = "";
          state.password = "";
          state.idStatus = "empty";
          state.emailForAuth = null;
          clearHints();
          recomputeSubmitEnabled();

          // Después de sincronizar las preferencias en el login,
          // recargamos la base de entries para las prefs vigentes
          // y volvemos a mostrar el navigator en ese contexto.
          try {
            var prefsAfter =
              window.PrefsStore && typeof window.PrefsStore.load === "function"
                ? window.PrefsStore.load() || {}
                : null;

            if (
              prefsAfter &&
              window.EntriesMemory &&
              typeof window.EntriesMemory.loadForPrefs === "function"
            ) {
              await window.EntriesMemory.loadForPrefs(prefsAfter);
            }

            if (window.Main && typeof window.Main.showView === "function") {
              window.Main.showView("navigator");
            }
          } catch (eReload) {
            console.warn("[Login] reload entries / navigator after login failed", eReload);
          }

          showWelcomeInMain(syncMode);

          try {
            window.dispatchEvent(new CustomEvent("login:success", {}));
          } catch (e) {}
        } catch (e) {
          console.error("[Login] signIn error", e);
          var msg;
          if (e && typeof e.message === "string") {
            if (/invalid login credentials/i.test(e.message)) {
              msg = t("errorInvalidCredentials");
            } else {
              msg = t("errorGeneric");
            }
          } else {
            msg = t("errorGeneric");
          }
          showHint(globalHint, msg, "error");
        } finally {
          setBusy(false);
          if (
            window.SystemLoader &&
            typeof window.SystemLoader.hide === "function"
          ) {
            window.SystemLoader.hide();
          }
        }
      });
    }

    window.addEventListener("i18n:changed", function () {
      applyTexts(root);
    });
  }

  return { render: render };
})();
