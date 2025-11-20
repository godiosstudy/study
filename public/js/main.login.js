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
      email: "Correo",
      password: "Contraseña",
      submit: "Entrar",

      errorRequired: "Debes ingresar tu correo y contraseña.",
      errorGeneric: "No fue posible iniciar sesión. Verifica tus datos.",
      errorInvalidCredentials: "Correo o contraseña incorrectos.",

      welcomePrefix: "Bienvenido, ",
      prefsFromUser:
        " Se han aplicado en este sitio las preferencias guardadas en tu cuenta.",
      prefsFromSite:
        " Hemos guardado en tu cuenta las preferencias actuales de este sitio.",
    },
    en: {
      title: "Sign in",
      email: "Email",
      password: "Password",
      submit: "Sign in",

      errorRequired: "Please enter your email and password.",
      errorGeneric: "Could not sign you in. Please check your details.",
      errorInvalidCredentials: "Invalid email or password.",

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
  function render(container) {
    if (!container) return;
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "panel-single";

    wrap.innerHTML = [
      '<h1 class="main-view-title" id="login-title"></h1>',
      "",
      '<form class="form-vert" id="form-login" novalidate>',
      '  <div class="form-group">',
      '    <label for="login-email" id="lbl-login-email"></label>',
      '    <input type="email" id="login-email" autocomplete="email" />',
      "  </div>",
      '  <div class="form-group">',
      '    <label for="login-password" id="lbl-login-password"></label>',
      '    <input type="password" id="login-password" autocomplete="current-password" />',
      "  </div>",
      '  <div class="form-actions">',
      '    <button type="submit" class="chip" id="login-submit"></button>',
      "  </div>",
      "</form>",
      "",
      '<p class="field-hint" id="login-hint"></p>',
    ].join("\n");

    container.appendChild(wrap);

    applyTexts(wrap);
    wireLogic(wrap);
  }

  function applyTexts(root) {
    root.querySelector("#login-title").textContent = t("title");

    var lblEmail = root.querySelector("#lbl-login-email");
    var lblPassword = root.querySelector("#lbl-login-password");
    var btnSubmit = root.querySelector("#login-submit");
    var hint = root.querySelector("#login-hint");

    if (lblEmail) lblEmail.textContent = t("email");
    if (lblPassword) lblPassword.textContent = t("password");
    if (btnSubmit) btnSubmit.textContent = t("submit");
    if (hint) {
      hint.textContent = "";
      hint.classList.remove("error", "ok");
    }
  }

  function showHint(el, text, variant) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("error", "ok");
    if (variant === "error") el.classList.add("error");
    if (variant === "ok") el.classList.add("ok");
  }

  // Limpia el MAIN y muestra el mensaje de bienvenida
  function showWelcomeInMain(syncMode) {
    // En lugar de mostrar un mensaje en main, saltamos directo a navigator
    if (window.Main && typeof window.Main.showView === "function") {
      window.Main.showView("navigator");
    }
  }

  function wireLogic(root) {
    var form = root.querySelector("#form-login");
    var emailEl = root.querySelector("#login-email");
    var passwordEl = root.querySelector("#login-password");
    var submitBtn = root.querySelector("#login-submit");
    var hint = root.querySelector("#login-hint");

    function setBusy(isBusy) {
      if (!submitBtn) return;
      submitBtn.disabled = !!isBusy;
      submitBtn.textContent = isBusy ? "…" : t("submit");
    }

    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      if (!emailEl || !passwordEl) return;

      var email = (emailEl.value || "").trim();
      var password = passwordEl.value || "";

      if (!email || !password) {
        showHint(hint, t("errorRequired"), "error");
        return;
      }

      setBusy(true);
      showHint(hint, "", null);

      try {
        if (window.SystemLoader && typeof window.SystemLoader.show === "function") {
          window.SystemLoader.show();
        }

        if (
          !window.BackendSupabase ||
          !window.BackendSupabase.isConfigured ||
          !window.BackendSupabase.isConfigured()
        ) {
          throw new Error("[Supabase] Not configured.");
        }
        if (typeof window.BackendSupabase.signIn !== "function") {
          throw new Error("[Supabase] Backend not available.");
        }

        // 1) login contra Supabase
        await window.BackendSupabase.signIn({
          email: email,
          password: password,
        });

        // 2) sincronizar preferencias perfil ↔ sitio
        var syncResult = await syncPreferencesOnLogin();
        var syncMode = (syncResult && syncResult.mode) || "none";

        // 3) limpiar formulario
        form.reset();

        // 4) limpiar MAIN y mostrar bienvenida
        showWelcomeInMain(syncMode);

        // 5) avisar a otros componentes (header, etc.)
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

        showHint(hint, msg, "error");
      } finally {
        setBusy(false);
        if (window.SystemLoader && typeof window.SystemLoader.hide === "function") {
          window.SystemLoader.hide();
        }
      }
    });

    // Reaplicar textos si cambia idioma
    window.addEventListener("i18n:changed", function () {
      applyTexts(root);
    });
  }

  return { render: render };
})();
