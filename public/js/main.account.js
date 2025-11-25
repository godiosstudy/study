// main.account.js – vista de cuenta de usuario (perfil)
window.MainAccount = (function () {
  // ======================
  // Helpers de idioma
  // ======================
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
      title: "Mi cuenta",
      subtitle: "",
      subtitleNoUser: "Necesitas iniciar sesión para ver tu cuenta.",
      goLogin: "Ir a Iniciar sesión",

      // Campos
      username: "Nombre de usuario",
      firstName: "Nombre",
      lastName: "Apellido",
      email: "Correo",
      phone: "Teléfono",
      address: "Dirección",
      state: "Provincia / Estado",
      zip: "Código postal",
      country: "País",
      birthDate: "Fecha de nacimiento",
      gender: "Género",
      genderUnknown: "Sin especificar",
      genderFemale: "Mujer",
      genderMale: "Hombre",
      genderOther: "Otro",

      // Preferencias (eliminadas de esta vista)
      // Acciones / mensajes
      submit: "Guardar cambios",
      hintLoading: "Cargando tu perfil...",
      hintSaved: "Tu perfil fue actualizado correctamente.",
      hintErrorLoad:
        "No se pudo cargar tu perfil. Puedes intentar recargar la página.",
      hintErrorSave:
        "No se pudieron guardar los cambios. Inténtalo de nuevo.",
      hintNoUser: "No hay un usuario autenticado en este momento.",
      hintNoSupabase:
        "Supabase no está configurado. Verifica las variables SUPABASE_URL y SUPABASE_ANON_KEY.",
      hintRequiredNames: "Nombre y apellido son obligatorios.",
      hintRequiredEmail: "El correo es obligatorio y debe ser válido.",
    },
    en: {
      title: "My account",
      subtitle: "",
      subtitleNoUser: "You need to sign in to see your account.",
      goLogin: "Go to Sign in",

      // Fields
      username: "Username",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone",
      address: "Address",
      state: "State / Province",
      zip: "ZIP / Postal code",
      country: "Country",
      birthDate: "Birth date",
      gender: "Gender",
      genderUnknown: "Not specified",
      genderFemale: "Female",
      genderMale: "Male",
      genderOther: "Other",

      // Preferences (removed from this view)
      // Actions / messages
      submit: "Save changes",
      hintLoading: "Loading your profile...",
      hintSaved: "Your profile has been updated.",
      hintErrorLoad:
        "Could not load your profile. Try reloading the page.",
      hintErrorSave:
        "Could not save changes. Please try again.",
      hintNoUser: "There is no authenticated user at the moment.",
      hintNoSupabase:
        "Supabase is not configured. Check SUPABASE_URL and SUPABASE_ANON_KEY.",
      hintRequiredNames: "First and last name are required.",
      hintRequiredEmail: "Email is required and must be valid.",
    },
  };

  function t(key) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || key;
  }

  // Email simple
  function isEmailFormatValid(email) {
    if (!email) return false;
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }


  function isUsernameFormatValid(username) {
    if (!username) return false;
    var v = String(username).trim();
    var re = /^[a-z0-9_-]+$/; // minúsculas, números, guion, guion bajo
    return re.test(v);
  }

  async function checkUsernameExists(username, currentUsername) {
    username = (username || '').trim().toLowerCase();
    currentUsername = (currentUsername || '').trim().toLowerCase();
    if (!username) return null;
    // si es el mismo que ya tiene el perfil, se considera aceptable
    if (username === currentUsername) return false;

    if (
      !window.BackendSupabase ||
      typeof window.BackendSupabase.client !== "function" ||
      typeof window.BackendSupabase.isConfigured !== "function" ||
      !window.BackendSupabase.isConfigured()
    ) {
      return null;
    }

    var client = window.BackendSupabase.client();
    if (!client) return null;

    try {
      var query = client.from("profiles").select("p_username").eq("p_username", username).limit(1);
      var res;
      if (query && typeof query.maybeSingle === "function") {
        res = await query.maybeSingle();
        if (res.error) {
          console.warn("[Account] username check error", res.error);
          return null;
        }
        return !!res.data;
      } else {
        res = await query;
        if (res.error) {
          console.warn("[Account] username check error", res.error);
          return null;
        }
        return Array.isArray(res.data) && res.data.length > 0;
      }
    } catch (e) {
      console.warn("[Account] username check exception", e);
      return null;
    }
  }

  // ======================
  // Render principal
  // ======================
  function render(container) {
    if (!container) return;
    container.innerHTML = "";

    var user =
      (window.AuthSession &&
        typeof window.AuthSession.getUser === "function" &&
        window.AuthSession.getUser()) ||
      null;

    var wrap = document.createElement("div");
    wrap.className = "panel panel-single register-panel";
    container.appendChild(wrap);

    if (!user) {
      renderNoUser(wrap);
      return;
    }

    renderWithUser(wrap, user);
  }

  // ======================
  // Vista cuando NO hay usuario
  // ======================
  function renderNoUser(root) {
    root.innerHTML = [
      '<div class="main-view-header">',
      '  <h1 class="main-view-title" id="acc-title"></h1>',
      '</div>',
      '<p class="account-subtitle" id="acc-subtitle"></p>',
      '<p class="field-hint error" id="acc-hint"></p>',
      '<div class="form-actions">',
      '  <button type="button" class="chip primary" id="acc-go-login"></button>',
      "</div>",
    ].join("\n");

    applyTextsNoUser(root);
    wireNoUser(root);
  }

  function applyTextsNoUser(root) {
    var title = root.querySelector("#acc-title");
    var subtitle = root.querySelector("#acc-subtitle");
    var hint = root.querySelector("#acc-hint");
    var usernameHint = root.querySelector("#acc-username-hint");
    var btnLogin = root.querySelector("#acc-go-login");

    if (title) title.textContent = t("title");
    if (subtitle) subtitle.textContent = t("subtitleNoUser");
    if (hint) {
      hint.textContent = t("hintNoUser");
      hint.className = "field-hint error";
    }
    if (btnLogin) btnLogin.textContent = t("goLogin");
  }

  function wireNoUser(root) {
    var btnLogin = root.querySelector("#acc-go-login");
    if (btnLogin) {
      btnLogin.addEventListener("click", function () {
        if (window.Main && typeof window.Main.showView === "function") {
          window.Main.showView("login");
        }
      });
    }

    window.addEventListener("i18n:changed", function () {
      applyTextsNoUser(root);
    });
  }

  // ======================
  // Vista cuando SÍ hay usuario
  
  function setupAccountFloatingLabels(root) {
    if (!root) return;
    var nodes = root.querySelectorAll(
      ".reg-field input, .reg-field textarea, .reg-field select"
    );
    for (var i = 0; i < nodes.length; i++) {
      (function (el) {
        function refresh() {
          if (!el) return;
          var wrap = el.closest(".reg-field");
          if (!wrap) return;
          var value = el.value;
          if (value && String(value).trim() !== "") {
            wrap.classList.add("has-value");
          } else {
            wrap.classList.remove("has-value");
          }
        }
        el.addEventListener("input", refresh);
        el.addEventListener("change", refresh);
        el.addEventListener("blur", refresh);
        refresh();
      })(nodes[i]);
    }
  }

function renderWithUser(root, user) {
    root.innerHTML = [
      '<div class="main-view-header">',
      '  <h1 class="main-view-title" id="acc-title"></h1>',
      '</div>',
      '<p class="account-subtitle" id="acc-subtitle"></p>',
      "",
      '<div class="register-card">',
      '  <form id="form-account" novalidate>',
      '    <div class="register-step" id="acc-step-1">',
      '      <div class="reg-field" data-field="username">',
      '        <input type="text" id="acc-username" autocomplete="username" />',
      '        <label for="acc-username" id="lbl-username"></label>',
      '        <p class="field-hint" id="acc-username-hint"></p>',
      '      </div>',
      '      <div class="reg-field" data-field="first-name">',
      '        <input type="text" id="acc-first-name" autocomplete="given-name" />',
      '        <label for="acc-first-name" id="lbl-first-name"></label>',
      '      </div>',
      '      <div class="reg-field" data-field="last-name">',
      '        <input type="text" id="acc-last-name" autocomplete="family-name" />',
      '        <label for="acc-last-name" id="lbl-last-name"></label>',
      '      </div>',
      '      <div class="reg-field" data-field="email">',
      '        <input type="email" id="acc-email" autocomplete="email" />',
      '        <label for="acc-email" id="lbl-email"></label>',
      '      </div>',
      '      <div class="reg-field" data-field="phone">',
      '        <input type="tel" id="acc-phone" autocomplete="tel" />',
      '        <label for="acc-phone" id="lbl-phone"></label>',
      '      </div>',
      '      <div class="reg-field" data-field="address">',
      '        <input type="text" id="acc-address" autocomplete="street-address" />',
      '        <label for="acc-address" id="lbl-address"></label>',
      '      </div>',
      '      <div class="reg-field" data-field="state">',
      '        <input type="text" id="acc-state" autocomplete="address-level1" />',
      '        <label for="acc-state" id="lbl-state"></label>',
      '      </div>',
      '      <div class="reg-field" data-field="zip">',
      '        <input type="text" id="acc-zip" autocomplete="postal-code" />',
      '        <label for="acc-zip" id="lbl-zip"></label>',
      '      </div>',
      '      <div class="reg-field" data-field="country">',
      '        <input type="text" id="acc-country" autocomplete="country" />',
      '        <label for="acc-country" id="lbl-country"></label>',
      '      </div>',
      '      <div class="reg-field" data-field="birth">',
      '        <input type="date" id="acc-birth" />',
      '        <label for="acc-birth" id="lbl-birth-date"></label>',
      '      </div>',
      '      <div class="reg-field" data-field="gender">',
      '        <select id="acc-gender">',
      '          <option value="">' + "</option>",
      '        </select>',
      '        <label for="acc-gender" id="lbl-gender"></label>',
      '      </div>',
      '      <div class="register-actions single">',
      '        <button type="submit" class="chip primary" id="acc-submit"></button>',
      '      </div>',
      '    </div>',
      '  </form>',
      '</div>',
      "",
      '<p class="field-hint" id="acc-hint"></p>',
    ].join("\n");

    applyTextsWithUser(root);
    wireWithUser(root, user);
    loadProfileIntoForm(root, user);
    setupAccountFloatingLabels(root);
  }

  function applyTextsWithUser(root) {
    var title = root.querySelector("#acc-title");
    var subtitle = root.querySelector("#acc-subtitle");
    var lblUsername = root.querySelector("#lbl-username");
    var lblFirst = root.querySelector("#lbl-first-name");
    var lblLast = root.querySelector("#lbl-last-name");
    var lblEmail = root.querySelector("#lbl-email");
    var lblPhone = root.querySelector("#lbl-phone");
    var lblAddress = root.querySelector("#lbl-address");
    var lblState = root.querySelector("#lbl-state");
    var lblZip = root.querySelector("#lbl-zip");
    var lblCountry = root.querySelector("#lbl-country");
    var lblBirth = root.querySelector("#lbl-birth-date");
    var lblGender = root.querySelector("#lbl-gender");
    var lblPrefs = root.querySelector("#lbl-prefs");
    var btnSubmit = root.querySelector("#acc-submit");
    var genderSelect = root.querySelector("#acc-gender");

    if (title) title.textContent = t("title");
    if (subtitle) subtitle.textContent = t("subtitle");

    if (lblUsername) lblUsername.textContent = t("username");
    if (lblFirst) lblFirst.textContent = t("firstName");
    if (lblLast) lblLast.textContent = t("lastName");
    if (lblEmail) lblEmail.textContent = t("email");
    if (lblPhone) lblPhone.textContent = t("phone");
    if (lblAddress) lblAddress.textContent = t("address");
    if (lblState) lblState.textContent = t("state");
    if (lblZip) lblZip.textContent = t("zip");
    if (lblCountry) lblCountry.textContent = t("country");
    if (lblBirth) lblBirth.textContent = t("birthDate");
    if (lblGender) lblGender.textContent = t("gender");

    if (btnSubmit) btnSubmit.textContent = t("submit");

    if (genderSelect) {
      var currentVal = genderSelect.value;
      genderSelect.innerHTML = [
        '<option value="">' + t("genderUnknown") + "</option>",
        '<option value="female">' + t("genderFemale") + "</option>",
        '<option value="male">' + t("genderMale") + "</option>",
        '<option value="other">' + t("genderOther") + "</option>",
      ].join("\n");
      if (currentVal) genderSelect.value = currentVal;
    }
  }

  function wireWithUser(root, user) {
    var form = root.querySelector("#form-account");
    var hint = root.querySelector("#acc-hint");
    var usernameHint = root.querySelector("#acc-username-hint");
    var btnSubmit = root.querySelector("#acc-submit");

    if (hint) {
      hint.textContent = "";
      hint.className = "field-hint";
    }
    if (usernameHint) {
      usernameHint.textContent = "";
      usernameHint.classList.remove("error", "ok");
    }

    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        saveProfileFromForm(root, user);
      });
    }

    window.addEventListener("i18n:changed", function () {
      applyTextsWithUser(root);
    });

    if (btnSubmit) btnSubmit.disabled = false;
  }

  // ======================
  // Carga de datos desde Supabase
  // ======================
  function getSupabaseClient() {
    try {
      if (
        window.BackendSupabase &&
        typeof window.BackendSupabase.client === "function" &&
        typeof window.BackendSupabase.isConfigured === "function" &&
        window.BackendSupabase.isConfigured()
      ) {
        return window.BackendSupabase.client();
      }
    } catch (e) {
      console.warn("[Account] error getting BackendSupabase client", e);
    }
    return null;
  }

  function loadProfileIntoForm(root, user) {
    var hint = root.querySelector("#acc-hint");
    var usernameHint = root.querySelector("#acc-username-hint");
    var usernameInput = root.querySelector("#acc-username");
    var firstInput = root.querySelector("#acc-first-name");
    var lastInput = root.querySelector("#acc-last-name");
    var emailInput = root.querySelector("#acc-email");
    var phoneInput = root.querySelector("#acc-phone");
    var addrInput = root.querySelector("#acc-address");
    var stateInput = root.querySelector("#acc-state");
    var zipInput = root.querySelector("#acc-zip");
    var countryInput = root.querySelector("#acc-country");
    var birthInput = root.querySelector("#acc-birth");
    var genderInput = root.querySelector("#acc-gender");

    if (hint) {
      hint.textContent = t("hintLoading");
      hint.className = "field-hint";
    }

    var client = getSupabaseClient();
    if (!client) {
      if (hint) {
        hint.textContent = t("hintNoSupabase");
        hint.className = "field-hint error";
      }
      if (firstInput && user.user_metadata && user.user_metadata.first_name) {
        firstInput.value = user.user_metadata.first_name;
      }
      if (lastInput && user.user_metadata && user.user_metadata.last_name) {
        lastInput.value = user.user_metadata.last_name;
      }
      if (emailInput && user.email) {
        emailInput.value = user.email;
      }
      return;
    }

    var cols = [
      "id",
      "email",
      "first_name",
      "last_name",
      "phone",
      "address",
      "state",
      "zip_code",
      "country",
      "birth_date",
      "gender",
      "p_username",
    ].join(",");

    var query = client.from("profiles").select(cols).eq("id", user.id).limit(1);
    var promise;

    if (query && typeof query.maybeSingle === "function") {
      promise = query.maybeSingle();
    } else if (query && typeof query.single === "function") {
      promise = query.single();
    } else {
      promise = query;
    }

    if (!promise || typeof promise.then !== "function") {
      if (hint) {
        hint.textContent = t("hintErrorLoad");
        hint.className = "field-hint error";
      }
      return;
    }

    promise
      .then(function (res) {
        if (!res) return;
        if (res.error) {
          console.warn("[Account] load profile error", res.error);
          if (hint) {
            hint.textContent = t("hintErrorLoad");
            hint.className = "field-hint error";
          }
          return;
        }

        var row = res.data || null;
        var meta = user.user_metadata || {};

        if (!row) {
          row = {
            email: user.email || null,
            first_name: meta.first_name || null,
            last_name: meta.last_name || null,
          };
        }

        if (usernameInput) usernameInput.value = row.p_username || (meta && meta.username) || "";
        if (firstInput) firstInput.value = row.first_name || meta.first_name || "";
        if (lastInput) lastInput.value = row.last_name || meta.last_name || "";
        if (emailInput) emailInput.value = row.email || user.email || "";
        if (phoneInput) phoneInput.value = row.phone || "";
        if (addrInput) addrInput.value = row.address || "";
        if (stateInput) stateInput.value = row.state || "";
        if (zipInput) zipInput.value = row.zip_code || "";
        if (countryInput) countryInput.value = row.country || "";
        if (birthInput) birthInput.value = row.birth_date || "";
        if (genderInput) genderInput.value = row.gender || "";

        // Forzar actualización de labels flotantes después de cargar datos
        try {
          var evtInput;
          if (typeof Event === "function") {
            evtInput = new Event("input", { bubbles: true });
          }
          var evtChange;
          if (typeof Event === "function") {
            evtChange = new Event("change", { bubbles: true });
          }
          var inputs = [
            usernameInput,
            firstInput,
            lastInput,
            emailInput,
            phoneInput,
            addrInput,
            stateInput,
            zipInput,
            countryInput,
            birthInput,
            genderInput,
          ];
          for (var i = 0; i < inputs.length; i++) {
            var el = inputs[i];
            if (!el) continue;
            if (evtInput) el.dispatchEvent(evtInput);
            if (evtChange) el.dispatchEvent(evtChange);
          }
        } catch (e) {
          // si falla el dispatchEvent, simplemente ignoramos y dejamos que el usuario
          // fuerce el estado al editar
        }

        if (hint) {
          hint.textContent = "";
          hint.className = "field-hint";
        }
      })
      .catch(function (err) {
        console.warn("[Account] load profile error", err);
        if (hint) {
          hint.textContent = t("hintErrorLoad");
          hint.className = "field-hint error";
        }
      });
  }

  // ======================
  // Guardar cambios en Supabase
  // ======================
  async function saveProfileFromForm(root, user) {
    var hint = root.querySelector("#acc-hint");
    var usernameHint = root.querySelector("#acc-username-hint");
    var btnSubmit = root.querySelector("#acc-submit");

    var usernameInput = root.querySelector("#acc-username");
    var firstInput = root.querySelector("#acc-first-name");
    var lastInput = root.querySelector("#acc-last-name");
    var emailInput = root.querySelector("#acc-email");
    var phoneInput = root.querySelector("#acc-phone");
    var addrInput = root.querySelector("#acc-address");
    var stateInput = root.querySelector("#acc-state");
    var zipInput = root.querySelector("#acc-zip");
    var countryInput = root.querySelector("#acc-country");
    var birthInput = root.querySelector("#acc-birth");
    var genderInput = root.querySelector("#acc-gender");

    var username = usernameInput ? (usernameInput.value || "").trim().toLowerCase() : "";
    var firstName = firstInput ? firstInput.value.trim() : "";
    var lastName = lastInput ? lastInput.value.trim() : "";
    var email = emailInput ? emailInput.value.trim() : "";

    if (!username) {
      if (hint) {
        hint.textContent = t("usernameInvalid");
        hint.className = "field-hint error";
      }
      return;
    }

    if (!isUsernameFormatValid(username)) {
      if (hint) {
        hint.textContent = t("usernameInvalid");
        hint.className = "field-hint error";
      }
      return;
    }

    if (!firstName || !lastName) {
      if (hint) {
        hint.textContent = t("hintRequiredNames");
        hint.className = "field-hint error";
      }
      return;
    }

    if (!isEmailFormatValid(email)) {
      if (hint) {
        hint.textContent = t("hintRequiredEmail");
        hint.className = "field-hint error";
      }
      return;
    }

    var client = getSupabaseClient();
    if (!client) {
      if (hint) {
        hint.textContent = t("hintNoSupabase");
        hint.className = "field-hint error";
      }
      return;
    }

    if (btnSubmit) btnSubmit.disabled = true;
    if (hint) {
      hint.textContent = t("hintLoading");
      hint.className = "field-hint";
    }


    var currentUsername = "";
    try {
      if (user && user.user_metadata && user.user_metadata.username) {
        currentUsername = user.user_metadata.username;
      }
    } catch (e) {}

    var exists = await checkUsernameExists(username, currentUsername);
    if (exists === true) {
      if (hint) {
        hint.textContent = t("usernameExists");
        hint.className = "field-hint error";
      }
      return;
    }

    var payload = {
      id: user.id,
      email: email || null,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phoneInput ? phoneInput.value.trim() || null : null,
      address: addrInput ? addrInput.value.trim() || null : null,
      state: stateInput ? stateInput.value.trim() || null : null,
      zip_code: zipInput ? zipInput.value.trim() || null : null,
      country: countryInput ? countryInput.value.trim() || null : null,
      birth_date: birthInput ? birthInput.value || null : null,
      gender: genderInput ? genderInput.value || null : null,
      // NO se tocan roles, floor, credits, steps
    };

    var upsertPromise;
    try {
      upsertPromise = client
        .from("profiles")
        .upsert(payload, { onConflict: "id" });
    } catch (e) {
      console.warn("[Account] upsert call failed", e);
      upsertPromise = null;
    }

    if (!upsertPromise || typeof upsertPromise.then !== "function") {
      if (hint) {
        hint.textContent = t("hintErrorSave");
        hint.className = "field-hint error";
      }
      if (btnSubmit) btnSubmit.disabled = false;
      return;
    }

    upsertPromise
      .then(function (res) {
        if (res && res.error) {
          console.warn("[Account] upsert error", res.error);
          if (hint) {
            hint.textContent = t("hintErrorSave");
            hint.className = "field-hint error";
          }
          if (btnSubmit) btnSubmit.disabled = false;
          return;
        }

        // Actualizar metadatos de Auth (first_name / last_name)
        try {
          if (client.auth && typeof client.auth.updateUser === "function") {
            client.auth
              .updateUser({
                data: {
                  first_name: firstName,
                  last_name: lastName,
                },
              })
              .catch(function (err) {
                console.warn("[Account] updateUser metadata error", err);
              });
          }
        } catch (e) {
          console.warn("[Account] updateUser metadata error", e);
        }

        try {
          if (
            window.AuthSession &&
            typeof window.AuthSession.refresh === "function"
          ) {
            window.AuthSession.refresh();
          }
        } catch (e) {
          console.warn("[Account] AuthSession.refresh error", e);
        }

        if (hint) {
          hint.textContent = t("hintSaved");
          hint.className = "field-hint ok";
        }
        if (btnSubmit) btnSubmit.disabled = false;
      })
      .catch(function (err) {
        console.warn("[Account] upsert error", err);
        if (hint) {
          hint.textContent = t("hintErrorSave");
          hint.className = "field-hint error";
        }
        if (btnSubmit) btnSubmit.disabled = false;
      });
  }

  return { render: render };
})();