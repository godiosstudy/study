// main.account.js ΓÇô vista de cuenta de usuario (perfil)
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
      subtitleNoUser: "Necesitas iniciar sesi├│n para ver tu cuenta.",
      goLogin: "Ir a Iniciar sesi├│n",

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
        "No se pudo cargar tu perfil. Puedes intentar recargar la p├ígina.",
      hintErrorSave:
        "No se pudieron guardar los cambios. Int├⌐ntalo de nuevo.",
      hintNoUser: "No hay un usuario autenticado en este momento.",
      hintNoSupabase:
        "Supabase no est├í configurado. Verifica las variables SUPABASE_URL y SUPABASE_ANON_KEY.",
      hintRequiredNames: "Nombre y apellido son obligatorios.",
      hintRequiredEmail: "El correo es obligatorio y debe ser v├ílido.",
      usernameInvalid: "Nombre de usuario inv├ílido. Usa solo min├║sculas, n├║meros, guion y guion bajo.",
      usernameAllowed: "Caracteres permitidos: letras minúsculas, números, guion (-) y guion bajo (_).",
      usernameExists: "Nombre de usuario NO disponible para registro en GODiOS.",
      usernameOk: "Nuevo nombre de usuario disponible para registro en GODiOS.",
      emailExists: "Nuevo correo NO disponible para registro en GODiOS.",
      emailOk: "Nuevo correo disponible para registro en GODiOS.",
      statsCredits: "Cr├⌐ditos",
      statsSteps: "Escalones",
      statsFloors: "Pisos",
      statsRoles: "Roles",
      statsViews: "Vistas",
      statsLikes: "Me gusta",
      statsNotes: "Notas",
      statsShares: "Compartidos",
      statsNotifs: "Notificaciones",
      statsHistory: "Historial",
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
      usernameInvalid: "Invalid username. Use only lowercase letters, numbers, dash and underscore.",
      usernameAllowed: "Allowed characters: lowercase letters, numbers, dash (-) and underscore (_).",
      usernameExists: "Username is not available for registration in GODiOS.",
      usernameOk: "New username available for registration in GODiOS.",
      emailExists: "New email is not available for registration in GODiOS.",
      emailOk: "New email available for registration in GODiOS.",
      statsCredits: "Credits",
      statsSteps: "Steps",
      statsFloors: "Floors",
      statsRoles: "Roles",
      statsViews: "Views",
      statsLikes: "Likes",
      statsNotes: "Notes",
      statsShares: "Shares",
      statsNotifs: "Notifications",
      statsHistory: "History",
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
    var re = /^[a-z0-9_-]+$/; // min├║sculas, n├║meros, guion, guion bajo
    return re.test(v);
  }

  async function checkUsernameExists(username, currentUsername, userId) {
    username = (username || "").trim().toLowerCase();
    currentUsername = (currentUsername || "").trim().toLowerCase();
    if (!username) return null;

    // Si es el mismo nombre que ya tiene el perfil, no hay conflicto
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
      var query = client
        .from("profiles")
        .select("id, p_username")
        .eq("p_username", username);

      // Excluir el propio usuario de la b├║squeda para permitir su username actual
      if (userId) {
        query = query.neq("id", userId);
      }

      query = query.limit(1);

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
  // Vista cuando S├ì hay usuario
  
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
      "",
      '<div class="account-stats" id="acc-stats">',
      '  <div class="account-stats-chips">',
      '    <div class="account-stat-chip account-stat-chip--credits">',
      '      <div class="account-stat-count" id="acc-stat-credits">0</div>',
      '      <div class="account-stat-icon"><i data-lucide="coins"></i></div>',
      '      <div class="account-stat-label" id="acc-label-credits"></div>',
      '    </div>',
      '    <div class="account-stat-chip account-stat-chip--steps">',
      '      <div class="account-stat-count" id="acc-stat-steps">0</div>',
      '      <div class="account-stat-icon"><i data-lucide="trending-up"></i></div>',
      '      <div class="account-stat-label" id="acc-label-steps"></div>',
      '    </div>',
      '    <div class="account-stat-chip account-stat-chip--floors">',
      '      <div class="account-stat-count" id="acc-stat-floors">0</div>',
      '      <div class="account-stat-icon"><i data-lucide="layers"></i></div>',
      '      <div class="account-stat-label" id="acc-label-floors"></div>',
      '    </div>',
      '    <div class="account-stat-chip account-stat-chip--roles">',
      '      <div class="account-stat-count" id="acc-stat-roles">0</div>',
      '      <div class="account-stat-icon"><i data-lucide="users"></i></div>',
      '      <div class="account-stat-label" id="acc-label-roles"></div>',
      '    </div>',
      '    <div class="account-stat-chip account-stat-chip--views">',
      '      <div class="account-stat-count" id="acc-stat-views">0</div>',
      '      <div class="account-stat-icon"><i data-lucide="eye"></i></div>',
      '      <div class="account-stat-label" id="acc-label-views"></div>',
      '    </div>',
      '    <div class="account-stat-chip account-stat-chip--likes">',
      '      <div class="account-stat-count" id="acc-stat-likes">0</div>',
      '      <div class="account-stat-icon"><i data-lucide="heart"></i></div>',
      '      <div class="account-stat-label" id="acc-label-likes"></div>',
      '    </div>',
      '    <div class="account-stat-chip account-stat-chip--notes">',
      '      <div class="account-stat-count" id="acc-stat-notes">0</div>',
      '      <div class="account-stat-icon"><i data-lucide="file-text"></i></div>',
      '      <div class="account-stat-label" id="acc-label-notes"></div>',
      '    </div>',
      '    <div class="account-stat-chip account-stat-chip--shares">',
      '      <div class="account-stat-count" id="acc-stat-shares">0</div>',
      '      <div class="account-stat-icon"><i data-lucide="share-2"></i></div>',
      '      <div class="account-stat-label" id="acc-label-shares"></div>',
      '    </div>',
      '    <div class="account-stat-chip account-stat-chip--notifications">',
      '      <div class="account-stat-count" id="acc-stat-notifs">0</div>',
      '      <div class="account-stat-icon"><i data-lucide="bell"></i></div>',
      '      <div class="account-stat-label" id="acc-label-notifs"></div>',
      '    </div>',
      '    <div class="account-stat-chip account-stat-chip--history">',
      '      <div class="account-stat-count" id="acc-stat-history">0</div>',
      '      <div class="account-stat-icon"><i data-lucide="history"></i></div>',
      '      <div class="account-stat-label" id="acc-label-history"></div>',
      '    </div>',
      '  </div>',
      '</div>',
      "",
      '<div class="register-card">',
      '  <form id="form-account" novalidate>',
      '    <div class="register-step" id="acc-step-1">',
      '      <div class="reg-field account-primary-field" data-field="username">',
      '        <input type="text" id="acc-username" autocomplete="username" />',
      '        <label for="acc-username" id="lbl-username"></label>',
      '        <p class="field-hint field-helper-text" id="acc-username-hint"></p>',
      '      </div>',
      '      <div class="reg-field account-primary-field" data-field="email">',
      '        <input type="email" id="acc-email" autocomplete="email" />',
      '        <label for="acc-email" id="lbl-email"></label>',
      '        <p class="field-hint" id="acc-email-hint"></p>',
      '      </div>',
      '      <div class="reg-field" data-field="first-name">',
      '        <input type="text" id="acc-first-name" autocomplete="given-name" />',
      '        <label for="acc-first-name" id="lbl-first-name"></label>',
      '      </div>',
      '      <div class="reg-field" data-field="last-name">',
      '        <input type="text" id="acc-last-name" autocomplete="family-name" />',
      '        <label for="acc-last-name" id="lbl-last-name"></label>',
      '      </div>',      '      <div class="account-separator"></div>',
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

    // Activar iconos Lucide en las estad├¡sticas de cuenta
    try {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    } catch (eLucide) {}
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

    // Etiquetas de estad├¡sticas de cuenta
    var lblStatsCredits = root.querySelector("#acc-label-credits");
    var lblStatsSteps = root.querySelector("#acc-label-steps");
    var lblStatsFloors = root.querySelector("#acc-label-floors");
    var lblStatsRoles = root.querySelector("#acc-label-roles");
    var lblStatsViews = root.querySelector("#acc-label-views");
    var lblStatsLikes = root.querySelector("#acc-label-likes");
    var lblStatsNotes = root.querySelector("#acc-label-notes");
    var lblStatsShares = root.querySelector("#acc-label-shares");
    var lblStatsNotifs = root.querySelector("#acc-label-notifs");
    var lblStatsHistory = root.querySelector("#acc-label-history");

    if (lblStatsCredits) lblStatsCredits.textContent = t("statsCredits");
    if (lblStatsSteps) lblStatsSteps.textContent = t("statsSteps");
    if (lblStatsFloors) lblStatsFloors.textContent = t("statsFloors");
    if (lblStatsRoles) lblStatsRoles.textContent = t("statsRoles");
    if (lblStatsViews) lblStatsViews.textContent = t("statsViews");
    if (lblStatsLikes) lblStatsLikes.textContent = t("statsLikes");
    if (lblStatsNotes) lblStatsNotes.textContent = t("statsNotes");
    if (lblStatsShares) lblStatsShares.textContent = t("statsShares");
    if (lblStatsNotifs) lblStatsNotifs.textContent = t("statsNotifs");
    if (lblStatsHistory) lblStatsHistory.textContent = t("statsHistory");

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
    var emailHint = root.querySelector("#acc-email-hint");
    var btnSubmit = root.querySelector("#acc-submit");
    var usernameInput = root.querySelector("#acc-username");
    var emailInput = root.querySelector("#acc-email");

    if (hint) {
      hint.textContent = "";
      hint.className = "field-hint";
    }
    if (usernameHint) {
      usernameHint.textContent = t("usernameAllowed");
      usernameHint.className = "field-hint";
    }
    if (emailHint) {
      emailHint.textContent = "";
      emailHint.className = "field-hint";
    }

    // Limpiamos cualquier mensaje previo en el header al cargar la vista
    if (
      window.HeaderMessages &&
      typeof window.HeaderMessages.hide === "function"
    ) {
      window.HeaderMessages.hide();
    }

    function sendHeaderFieldMessage(text, variant) {
      // Muestra los mensajes de validaci├│n en el header, no debajo del campo
      if (!text) {
        if (
          window.HeaderMessages &&
          typeof window.HeaderMessages.hide === "function"
        ) {
          window.HeaderMessages.hide();
        }
        return;
      }

      if (
        window.HeaderMessages &&
        typeof window.HeaderMessages.show === "function"
      ) {
        var options = {};
        if (variant === "error") options.type = "error";
        else if (variant === "warning") options.type = "warning";
        else if (variant === "success" || variant === "ok") options.type = "success";
        window.HeaderMessages.show(text, options);
      } else {
        try {
          console.warn("[Account]", text);
        } catch (e) {}
      }
    }

    function setUsernameHint(text, variant) {
      sendHeaderFieldMessage(text, variant);
    }

    function setEmailHint(text, variant) {
      sendHeaderFieldMessage(text, variant);
    }

    var originalUsername = "";
    function syncOriginalUsernameFromDataset() {
      if (root && root.dataset && typeof root.dataset.accOriginalUsername === "string") {
        originalUsername = root.dataset.accOriginalUsername;
      }
    }


    var currentUsername = "";
    var currentEmail = "";
    try {
      if (user && user.user_metadata && user.user_metadata.username) {
        currentUsername = String(user.user_metadata.username || "").trim().toLowerCase();
      }
      if (user && user.email) {
        currentEmail = String(user.email || "").trim().toLowerCase();
      }
    } catch (e) {}

    var usernameValid = true;
    var emailValid = true;

    function updateSubmitState() {
      if (!btnSubmit) return;
      btnSubmit.disabled = !(usernameValid && emailValid);
    }

    async function validateUsernameLive() {
      if (!usernameInput) return;
      syncOriginalUsernameFromDataset();
      var value = (usernameInput.value || "").trim().toLowerCase();

      // Si no cambio, no mostramos mensaje y es valido
      if (value === originalUsername || value === currentUsername) {
        usernameValid = true;
        setUsernameHint("", null);
        updateSubmitState();
        return;
      }

      if (!value || !isUsernameFormatValid(value)) {
        usernameValid = false;
        setUsernameHint(t("usernameInvalid"), "error");
        updateSubmitState();
        return;
      }

      var compareAgainst = originalUsername || currentUsername;
      var exists = await checkUsernameExists(value, compareAgainst, user && user.id);
      if (exists === true) {
        usernameValid = false;
        setUsernameHint(t("usernameExists"), "error");
      } else if (exists === false) {
        usernameValid = true;
        setUsernameHint(t("usernameOk"), "success");
      } else {
        usernameValid = true;
        setUsernameHint("", null);
      }
      updateSubmitState();
    }
    async function validateEmailLive() {
      if (!emailInput) return;
      var raw = (emailInput.value || "").trim();
      var lower = raw.toLowerCase();

      // Si no cambi├│, no mostramos mensaje y es v├ílido
      if (lower === currentEmail) {
        emailValid = true;
        setEmailHint("", null);
        updateSubmitState();
        return;
      }

      if (!raw || !isEmailFormatValid(raw)) {
        emailValid = false;
        setEmailHint(t("hintRequiredEmail"), "error");
        updateSubmitState();
        return;
      }

      var exists = await checkEmailExistsForAccount(raw, currentEmail);
      if (exists === true) {
        emailValid = false;
        setEmailHint(t("emailExists"), "error");
      } else if (exists === false) {
        emailValid = true;
        setEmailHint(t("emailOk"), "success");
      } else {
        emailValid = true;
        setEmailHint("", null);
      }
      updateSubmitState();
    }

    if (usernameInput) {
      usernameInput.addEventListener("blur", function () {
        validateUsernameLive();
      });
      usernameInput.addEventListener("change", function () {
        validateUsernameLive();
      });
    }

    if (emailInput) {
      emailInput.addEventListener("blur", function () {
        validateEmailLive();
      });
      emailInput.addEventListener("change", function () {
        validateEmailLive();
      });
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

    updateSubmitState();
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
    function storeOriginalUsernameFromInput() {
      if (root && root.dataset) {
        root.dataset.accOriginalUsername =
          usernameInput && usernameInput.value
            ? usernameInput.value.trim().toLowerCase()
            : "";
      }
    }

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
      storeOriginalUsernameFromInput();
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
      "p_roles",
      "p_credits",
      "p_steps",
      "p_floor",
      "p_views",
      "p_likes",
      "p_notes",
      "p_shares",
      "p_notifications",
      "p_history",
      "last_view",
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
        storeOriginalUsernameFromInput();
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

        // Estad├¡sticas de cuenta (tomadas del perfil)
        var elStatCredits = root.querySelector("#acc-stat-credits");
        var elStatSteps = root.querySelector("#acc-stat-steps");
      
        var elStatFloors = root.querySelector("#acc-stat-floors");
        var elStatRoles = root.querySelector("#acc-stat-roles");
        var elStatViews = root.querySelector("#acc-stat-views");
        var elStatLikes = root.querySelector("#acc-stat-likes");
        var elStatNotes = root.querySelector("#acc-stat-notes");
        var elStatShares = root.querySelector("#acc-stat-shares");
        var elStatNotifs = root.querySelector("#acc-stat-notifs");
        var elStatHistory = root.querySelector("#acc-stat-history");

        var credits = row.p_credits || 0;
        var steps = row.p_steps || 0;
        var floors = row.p_floor || 0;
        var views = row.p_views || 0;
        var likes = row.p_likes || 0;
        var notes = row.p_notes || 0;
        var shares = row.p_shares || 0;
        var notifs = row.p_notifications || 0;
        var rolesCount = row.p_roles || 0;
        var historyCount = row.p_history || 0;

        if (elStatCredits) elStatCredits.textContent = String(credits || 0);
        if (elStatSteps) elStatSteps.textContent = String(steps || 0);
        if (elStatFloors) elStatFloors.textContent = String(floors || 0);
        if (elStatRoles) elStatRoles.textContent = String(rolesCount || 0);
        if (elStatViews) elStatViews.textContent = String(views || 0);
        if (elStatLikes) elStatLikes.textContent = String(likes || 0);
        if (elStatNotes) elStatNotes.textContent = String(notes || 0);
        if (elStatShares) elStatShares.textContent = String(shares || 0);
        if (elStatNotifs) elStatNotifs.textContent = String(notifs || 0);
        if (elStatHistory) elStatHistory.textContent = String(historyCount || 0);ent = String(likes || 0);
        if (elStatNotes) elStatNotes.textContent = String(notes || 0);
        if (elStatShares) elStatShares.textContent = String(shares || 0);
        if (elStatNotifs) elStatNotifs.textContent = String(notifs || 0);
        if (elStatHistory) elStatHistory.textContent = String(historyCount || 0);

        // Forzar actualizaci├│n de labels flotantes despu├⌐s de cargar datos
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

    function showHeaderValidationMessage(textKey, variant) {
      var text = textKey ? t(textKey) : "";
      if (!text) return;
      if (
        window.HeaderMessages &&
        typeof window.HeaderMessages.show === "function"
      ) {
        var options = {};
        if (variant === "error") options.type = "error";
        else if (variant === "warning") options.type = "warning";
        else if (variant === "success" || variant === "ok") options.type = "success";
        window.HeaderMessages.show(text, options);
      } else {
        try {
          console.warn("[Account]", text);
        } catch (e) {}
      }
    }

    var username = usernameInput ? (usernameInput.value || "").trim().toLowerCase() : "";
    var firstName = firstInput ? firstInput.value.trim() : "";
    var lastName = lastInput ? lastInput.value.trim() : "";
    var email = emailInput ? emailInput.value.trim() : "";

    if (!username) {
      // Username requerido: mensaje en header, no debajo del campo
      showHeaderValidationMessage("usernameInvalid", "error");
      if (hint) {
        hint.textContent = "";
        hint.className = "field-hint";
      }
      return;
    }

    if (!isUsernameFormatValid(username)) {
      // Formato de username inv├ílido: mensaje en header
      showHeaderValidationMessage("usernameInvalid", "error");
      if (hint) {
        hint.textContent = "";
        hint.className = "field-hint";
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
      // Email inv├ílido: mensaje en header
      showHeaderValidationMessage("hintRequiredEmail", "error");
      if (hint) {
        hint.textContent = "";
        hint.className = "field-hint";
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


    var originalUsername = "";
    if (root && root.dataset && typeof root.dataset.accOriginalUsername === "string") {
      originalUsername = (root.dataset.accOriginalUsername || "").trim().toLowerCase();
    }
    var currentUsername = originalUsername;
    try {
      if (!currentUsername && user && user.user_metadata && user.user_metadata.username) {
        currentUsername = (user.user_metadata.username || "").trim().toLowerCase();
      }
    } catch (e) {}

    if (username !== originalUsername) {
      var exists = await checkUsernameExists(username, currentUsername, user && user.id);
      if (exists === true) {
        // Username en uso por otro usuario: mensaje en header
        showHeaderValidationMessage("usernameExists", "error");
        if (hint) {
          hint.textContent = "";
          hint.className = "field-hint";
        }
        if (btnSubmit) btnSubmit.disabled = false;
        return;
      }
    }

    var payload = {
      id: user.id,
      email: email || null,
      first_name: firstName || null,
      last_name: lastName || null,
      p_username: username || null,
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
        // y, si el email cambi├│ en el perfil, actualizar tambi├⌐n el email en auth.users
        try {
          if (client.auth && typeof client.auth.updateUser === "function") {
            var updatePayload = {
              data: {
                first_name: firstName,
                last_name: lastName,
              },
            };
            // Si el usuario tiene email de Auth y el nuevo email es distinto, lo actualizamos.
            try {
              var originalEmail = (user && user.email) || "";
              if (
                email &&
                originalEmail &&
                email.toLowerCase() !== originalEmail.toLowerCase()
              ) {
                updatePayload.email = email;
              }
            } catch (e) {}
            client.auth
              .updateUser(updatePayload)
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
          hint.textContent = "";
          hint.className = "field-hint";
        }
        if (window.HeaderMessages && typeof window.HeaderMessages.show === "function") {
          window.HeaderMessages.show(t("hintSaved"));
        }
        if (window.Main && typeof window.Main.showView === "function") {
          window.Main.showView("navigator");
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


  async function checkEmailExistsForAccount(email, currentEmail) {
    email = (email || "").trim().toLowerCase();
    currentEmail = (currentEmail || "").trim().toLowerCase();
    if (!email) return null;

    // Si el correo es igual al actual, no hay conflicto
    if (email === currentEmail) return false;

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
      var res = await client.rpc("email_exists", { p_email: email });
      if (res && res.error) {
        console.warn("[Account] email_exists error", res.error);
        return null;
      }
      return !!(res && res.data);
    } catch (e) {
      console.warn("[Account] email_exists exception", e);
      return null;
    }
  }

  return { render: render };
})();
