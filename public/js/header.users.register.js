// public/js/header.users.register.js
;(function () {
  // ---------- Supabase client (desde script global) ----------
  let supa = null;

  function getSupabaseClient() {
    if (supa) return supa;
    if (!window.supabase) {
      console.warn('[Register] supabase global no disponible');
      return null;
    }
    const url = window.VITE_SUPABASE_URL;
    const key = window.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || /YOUR-REF/.test(url) || /YOUR-ANON-KEY/.test(key)) {
      console.warn('[Register] Supabase no configurado (URL o key de ejemplo)');
      return null;
    }
    supa = window.supabase.createClient(url, key);
    return supa;
  }

  // ---------- idioma / traducciones ----------
  function getPrefsLang() {
    const store = window.PrefsStore;
    const loaded = store && store.load && store.load();
    return (
      (loaded && loaded.language) ||
      (store && store.DEFAULTS && store.DEFAULTS.language) ||
      'es'
    );
  }

  function getTRRoot(lang) {
    const base = window.I18n && window.I18n.__TR;
    return base ? base[lang] : null;
  }

  const FALLBACK = {
    es: {
      title: 'Registrarse',
      nameLabel: 'Nombre',
      emailLabel: 'Correo electrónico',
      passwordLabel: 'Contraseña',
      emailPlaceholder: 'tucorreo@ejemplo.com',
      passwordPlaceholder: 'Crea una contraseña',
      namePlaceholder: 'Tu nombre',
      cancel: 'Cancelar',
      submit: 'Registrarse',
      emailInvalid: 'Ingresa un correo válido.',
      emailChecking: 'Verificando correo…',
      emailTaken: 'Este correo ya está registrado.',
      emailFree: 'Este correo está disponible.',
      required: 'Por favor completa todos los campos.',
      passwordTooShort: 'La contraseña debe tener al menos 6 caracteres.',
      genericError: 'Ocurrió un error al registrarte. Inténtalo de nuevo.',
      success: 'Registro exitoso. Revisa tu correo para confirmar la cuenta.',
    },
    en: {
      title: 'Sign up',
      nameLabel: 'Name',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      emailPlaceholder: 'you@example.com',
      passwordPlaceholder: 'Create a password',
      namePlaceholder: 'Your name',
      cancel: 'Cancel',
      submit: 'Sign up',
      emailInvalid: 'Please enter a valid email.',
      emailChecking: 'Checking email…',
      emailTaken: 'This email is already registered.',
      emailFree: 'This email is available.',
      required: 'Please fill in all fields.',
      passwordTooShort: 'Password must be at least 6 characters.',
      genericError: 'An error occurred while signing up. Please try again.',
      success: 'Sign up successful. Check your email to confirm your account.',
    },
  };

  function getRegisterStrings(lang) {
    const root = getTRRoot(lang);
    const fromTr = root && root.auth && root.auth.register;
    if (fromTr) return fromTr;
    return FALLBACK[lang] || FALLBACK.es;
  }

  // ---------- helper para título de solapa ----------
  function setViewTitle(label) {
    if (window.AppMain && typeof window.AppMain.setViewTitle === 'function') {
      window.AppMain.setViewTitle(label);
    }
  }

  // ---------- Comprobación de email (si existe en profiles) ----------
  let lastEmailCheckId = 0;

  async function checkEmailAvailability(email, strings, showStatus) {
    const trimmed = (email || '').trim();
    if (!trimmed) {
      showStatus('', 'neutral');
      return null;
    }

    // Validación simple de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      showStatus(strings.emailInvalid, 'error');
      return false;
    }

    const client = getSupabaseClient();
    if (!client) {
      // No podemos consultar; solo decimos que el formato es válido
      showStatus('', 'neutral');
      return null;
    }

    const currentId = ++lastEmailCheckId;
    showStatus(strings.emailChecking, 'info');

    try {
      const { data, error } = await client
        .from('profiles')
        .select('id')
        .eq('email', trimmed)
        .maybeSingle();

      // Si llegó una respuesta vieja, la ignoramos
      if (currentId !== lastEmailCheckId) return null;

      if (error && error.code !== 'PGRST116') {
        console.warn('[Register] error al verificar email:', error);
        showStatus('', 'neutral');
        return null;
      }

      if (data && data.id) {
        showStatus(strings.emailTaken, 'error');
        return false;
      } else {
        showStatus(strings.emailFree, 'success');
        return true;
      }
    } catch (e) {
      console.warn('[Register] excepción al verificar email:', e);
      showStatus('', 'neutral');
      return null;
    }
  }

  // ---------- Registro con Supabase Auth ----------
  async function performRegister(name, email, password, strings) {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      throw error;
    }
    return data;
  }

  // ---------- Vista de registro ----------
  function renderRegisterScreen() {
    if (!window.AppMain || typeof window.AppMain.renderScreen !== 'function') {
      console.warn('[Register] AppMain.renderScreen no está disponible');
      return;
    }

    const lang = getPrefsLang();
    const STR = getRegisterStrings(lang);

    // Título en la solapa
    setViewTitle(STR.title);

    window.AppMain.renderScreen(function (root) {
      root.innerHTML = `
        <section class="panel panel-single reg-panel auth-panel">
          <form id="register-form" novalidate>
            <div class="reg-body">
              <div class="reg-field">
                <label for="reg-name">${STR.nameLabel}</label>
                <input id="reg-name" type="text" autocomplete="name" placeholder="${STR.namePlaceholder}">
              </div>

              <div class="reg-field">
                <label for="reg-email">${STR.emailLabel}</label>
                <input id="reg-email" type="email" autocomplete="email" placeholder="${STR.emailPlaceholder}">
                <div id="reg-email-status" class="auth-field-status"></div>
              </div>

              <div class="reg-field">
                <label for="reg-password">${STR.passwordLabel}</label>
                <input id="reg-password" type="password" autocomplete="new-password" placeholder="${STR.passwordPlaceholder}">
              </div>
            </div>

            <div id="reg-global-status" class="auth-global-status"></div>

            <footer class="reg-foot">
              <button type="button" id="reg-cancel" class="btn ghost">${STR.cancel}</button>
              <button type="submit" id="reg-submit" class="btn primary">${STR.submit}</button>
            </footer>
          </form>
        </section>
      `;

      const form = root.querySelector('#register-form');
      const nameInput = root.querySelector('#reg-name');
      const emailInput = root.querySelector('#reg-email');
      const passInput = root.querySelector('#reg-password');
      const emailStatusEl = root.querySelector('#reg-email-status');
      const globalStatusEl = root.querySelector('#reg-global-status');
      const btnCancel = root.querySelector('#reg-cancel');
      const btnSubmit = root.querySelector('#reg-submit');

      function setEmailStatus(text, type) {
        if (!emailStatusEl) return;
        emailStatusEl.textContent = text || '';
        emailStatusEl.className = 'auth-field-status';
        if (text && type) {
          emailStatusEl.classList.add('status-' + type);
        }
      }

      function setGlobalStatus(text, type) {
        if (!globalStatusEl) return;
        globalStatusEl.textContent = text || '';
        globalStatusEl.className = 'auth-global-status';
        if (text && type) {
          globalStatusEl.classList.add('status-' + type);
        }
      }

      let emailCheckTimeout = null;

      emailInput &&
        emailInput.addEventListener('input', function () {
          setGlobalStatus('', '');
          if (emailCheckTimeout) clearTimeout(emailCheckTimeout);
          const val = emailInput.value;
          // debounce 400ms
          emailCheckTimeout = setTimeout(function () {
            checkEmailAvailability(val, STR, setEmailStatus);
          }, 400);
        });

      // Cancelar → volvemos a la bienvenida
      btnCancel &&
        btnCancel.addEventListener('click', function (e) {
          e.preventDefault();
          if (window.AppMain && window.AppMain.showWelcomeView) {
            window.AppMain.showWelcomeView();
          }
        });

      form &&
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          setGlobalStatus('', '');
          // mantenemos el mensaje actual de email, solo reseteamos global
          const name = (nameInput && nameInput.value.trim()) || '';
          const email = (emailInput && emailInput.value.trim()) || '';
          const password = (passInput && passInput.value) || '';

          if (!name || !email || !password) {
            setGlobalStatus(STR.required, 'error');
            return;
          }

          if (password.length < 6) {
            setGlobalStatus(STR.passwordTooShort, 'error');
            return;
          }

          // Comprobación rápida de formato + disponibilidad
          const available = await checkEmailAvailability(email, STR, setEmailStatus);
          if (available === false) {
            setGlobalStatus(STR.emailTaken, 'error');
            return;
          }

          btnSubmit.disabled = true;
          btnSubmit.classList.add('is-loading');

          try {
            await performRegister(name, email, password, STR);
            setGlobalStatus(STR.success, 'success');
          } catch (err) {
            console.warn('[Register] error en signUp:', err);
            setGlobalStatus(STR.genericError, 'error');
          } finally {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('is-loading');
          }
        });
    });
  }

  // ---------- Delegación en el botón "Registrarse" del header ----------
  function bindRegisterDelegation() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('#hdr-register');
      if (!btn) return;
      e.preventDefault();
      renderRegisterScreen();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindRegisterDelegation);
  } else {
    bindRegisterDelegation();
  }
})();
