// main.register.js – Registro con validación de correo y Supabase
window.MainRegister = (function () {
  function getLang() {
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === 'function') {
        var prefs = window.PrefsStore.load();
        if (prefs && prefs.language) return prefs.language;
      }
    } catch (e) {}
    return 'es';
  }

  var TEXTS = {
    es: {
      title: 'Registrarse',
      firstName: 'Nombre',
      lastName: 'Apellido',
      email: 'Correo',
      password: 'Contraseña',
      submit: 'Crear cuenta',

      emailInvalid: 'Correo inválido.',
      emailExists: 'Correo existente, iniciar sesión.',
      emailAvailable: 'Correo habilitado para el registro.',
      errorRequired: 'Todos los campos obligatorios deben completarse.',
      errorPasswordLength: 'La contraseña debe tener al menos 6 caracteres.',
      hintErrorGeneric: 'No fue posible crear la cuenta. Inténtalo de nuevo.',

      // ✅ nuevo texto: ya no hablamos de correo de confirmación
      successMessage:
        'Tu cuenta fue creada correctamente. Ahora puedes usar Estudio.GODiOS.org con tu correo y contraseña.',
    },
    en: {
      title: 'Sign up',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      password: 'Password',
      submit: 'Create account',

      emailInvalid: 'Invalid email.',
      emailExists: 'Email already registered, please sign in.',
      emailAvailable: 'Email available for registration.',
      errorRequired: 'All required fields must be completed.',
      errorPasswordLength: 'Password must be at least 6 characters long.',
      hintErrorGeneric: 'Could not create the account. Please try again.',

      successMessage:
        'Your account has been created successfully. You can now use Study.GODiOS.org with your email and password.',
    },
  };

  function t(key) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || key;
  }

  function isEmailFormatValid(email) {
    if (!email) return false;
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function render(container) {
    if (!container) return;
    container.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'panel-single';

    wrap.innerHTML = [
      '<h1 class="main-view-title" id="reg-title"></h1>',
      '',
      '<form class="form-vert" id="form-register" novalidate>',
      '  <div class="form-group">',
      '    <label for="reg-first-name" id="lbl-first-name"></label>',
      '    <input type="text" id="reg-first-name" autocomplete="given-name" />',
      '  </div>',
      '  <div class="form-group">',
      '    <label for="reg-last-name" id="lbl-last-name"></label>',
      '    <input type="text" id="reg-last-name" autocomplete="family-name" />',
      '  </div>',
      '  <div class="form-group">',
      '    <label for="reg-email" id="lbl-email"></label>',
      '    <input type="email" id="reg-email" autocomplete="email" required />',
      '    <p class="field-hint" id="reg-email-hint"></p>',
      '  </div>',
      '  <div class="form-group">',
      '    <label for="reg-password" id="lbl-password"></label>',
      '    <input type="password" id="reg-password" autocomplete="new-password" required />',
      '  </div>',
      '  <div class="form-actions">',
      '    <button type="submit" class="chip" id="reg-submit" disabled></button>',
      '  </div>',
      '</form>',
      '',
      '<div class="register-success" id="reg-success" style="display:none;"></div>',
      '',
      '<p class="field-hint" id="reg-hint"></p>',
    ].join('\n');

    container.appendChild(wrap);

    applyTexts(wrap);
    wireLogic(wrap);
  }

  function applyTexts(root) {
    root.querySelector('#reg-title').textContent = t('title');

    var lblFirst = root.querySelector('#lbl-first-name');
    var lblLast = root.querySelector('#lbl-last-name');
    var lblEmail = root.querySelector('#lbl-email');
    var lblPass = root.querySelector('#lbl-password');
    var btnSubmit = root.querySelector('#reg-submit');
    var emailHint = root.querySelector('#reg-email-hint');
    var hint = root.querySelector('#reg-hint');
    var successEl = root.querySelector('#reg-success');

    if (lblFirst) lblFirst.textContent = t('firstName');
    if (lblLast) lblLast.textContent = t('lastName');
    if (lblEmail) lblEmail.textContent = t('email');
    if (lblPass) lblPass.textContent = t('password');
    if (btnSubmit) btnSubmit.textContent = t('submit');

    if (emailHint) {
      emailHint.textContent = '';
      emailHint.classList.remove('error', 'ok');
    }
    if (hint) {
      hint.textContent = '';
      hint.classList.remove('error', 'ok');
    }
    if (successEl && successEl.style.display !== 'none') {
      // si ya estamos en estado de éxito, refrescamos el texto
      successEl.textContent = t('successMessage');
    }
  }

  function showFieldHint(el, text, variant) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('error', 'ok');
    if (variant === 'error') el.classList.add('error');
    if (variant === 'ok') el.classList.add('ok');
  }

  function showGlobalHint(el, text, variant) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('error', 'ok');
    if (variant === 'error') el.classList.add('error');
    if (variant === 'ok') el.classList.add('ok');
  }

  // ----- Consulta a Supabase para ver si el correo existe en auth.users -----
  async function checkEmailExists(email) {
    if (
      !window.BackendSupabase ||
      typeof window.BackendSupabase.client !== 'function' ||
      typeof window.BackendSupabase.isConfigured !== 'function' ||
      !window.BackendSupabase.isConfigured()
    ) {
      return null;
    }

    var client = window.BackendSupabase.client();
    if (!client) return null;

    try {
      var res = await client.rpc('email_exists', { p_email: email });
      if (res.error) {
        console.warn('[Register] email_exists error', res.error);
        return null;
      }
      return !!res.data;
    } catch (e) {
      console.warn('[Register] email check exception', e);
      return null;
    }
  }

  function wireLogic(root) {
    var form = root.querySelector('#form-register');
    var firstEl = root.querySelector('#reg-first-name');
    var lastEl = root.querySelector('#reg-last-name');
    var emailEl = root.querySelector('#reg-email');
    var passEl = root.querySelector('#reg-password');
    var submitBtn = root.querySelector('#reg-submit');
    var emailHint = root.querySelector('#reg-email-hint');
    var globalHint = root.querySelector('#reg-hint');
    var successEl = root.querySelector('#reg-success');

    var emailStatus = 'unknown'; // 'unknown' | 'invalid' | 'checking' | 'exists' | 'available'

    function setBusy(isBusy) {
      if (!submitBtn) return;
      submitBtn.disabled = !!isBusy;
      submitBtn.textContent = isBusy ? '…' : t('submit');
    }

    function recomputeCanSubmit() {
      if (!submitBtn) return;

      var first = (firstEl && firstEl.value || '').trim();
      var last = (lastEl && lastEl.value || '').trim();
      var email = (emailEl && emailEl.value || '').trim();
      var pass = passEl ? passEl.value || '' : '';

      var fieldsFilled = !!(first && last && email && pass);
      var passValid = pass.length >= 6;
      var emailOk = emailStatus === 'available';

      submitBtn.disabled = !(
        fieldsFilled &&
        passValid &&
        emailOk
      );
    }

    // mientras se escribe: validar formato
    if (emailEl) {
      emailEl.addEventListener('input', function () {
        var val = emailEl.value.trim();
        emailStatus = 'unknown';
        showFieldHint(emailHint, '', null);

        if (val && !isEmailFormatValid(val)) {
          emailStatus = 'invalid';
          showFieldHint(emailHint, t('emailInvalid'), 'error');
        }
        recomputeCanSubmit();
      });

      emailEl.addEventListener('blur', async function () {
        var val = emailEl.value.trim();
        if (!val) {
          emailStatus = 'unknown';
          showFieldHint(emailHint, '', null);
          recomputeCanSubmit();
          return;
        }

        if (!isEmailFormatValid(val)) {
          emailStatus = 'invalid';
          showFieldHint(emailHint, t('emailInvalid'), 'error');
          recomputeCanSubmit();
          return;
        }

        emailStatus = 'checking';
        showFieldHint(emailHint, '', null);
        recomputeCanSubmit();

        var exists = await checkEmailExists(val);
        if (exists === true) {
          emailStatus = 'exists';
          showFieldHint(emailHint, t('emailExists'), 'error');
        } else if (exists === false) {
          emailStatus = 'available';
          showFieldHint(emailHint, t('emailAvailable'), 'ok');
        } else {
          emailStatus = 'invalid';
          showFieldHint(emailHint, t('emailInvalid'), 'error');
        }
        recomputeCanSubmit();
      });
    }

    if (firstEl) firstEl.addEventListener('input', recomputeCanSubmit);
    if (lastEl) lastEl.addEventListener('input', recomputeCanSubmit);
    if (passEl) {
      passEl.addEventListener('input', function () {
        recomputeCanSubmit();
      });
    }

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      if (submitBtn && submitBtn.disabled) return;
      if (!emailEl || !passEl) return;

      var first = (firstEl && firstEl.value || '').trim();
      var last = (lastEl && lastEl.value || '').trim();
      var email = (emailEl.value || '').trim();
      var password = passEl.value || '';

      if (!first || !last || !email || !password) {
        showGlobalHint(globalHint, t('errorRequired'), 'error');
        return;
      }
      if (password.length < 6) {
        showGlobalHint(globalHint, t('errorPasswordLength'), 'error');
        return;
      }
      if (emailStatus !== 'available') {
        showGlobalHint(globalHint, t('emailInvalid'), 'error');
        return;
      }

      setBusy(true);
      showGlobalHint(globalHint, '', null);

      try {
        if (window.SystemLoader && typeof window.SystemLoader.show === 'function') {
          window.SystemLoader.show();
        }

        if (
          !window.BackendSupabase ||
          !window.BackendSupabase.isConfigured ||
          !window.BackendSupabase.isConfigured()
        ) {
          throw new Error('[Supabase] Not configured.');
        }
        if (typeof window.BackendSupabase.signUp !== 'function') {
          throw new Error('[Supabase] Backend not available.');
        }

        // Guardamos idioma en metadata para posible uso futuro en back
        var lang = getLang();

        await window.BackendSupabase.signUp({
          email: email,
          password: password,
          profile: {
            first_name: first || null,
            last_name: last || null,
            language: lang || 'es',
          },
        });

        // 🔹 ÉXITO:
        // 1) Limpiar el formulario
        form.reset();
        emailStatus = 'unknown';
        showFieldHint(emailHint, '', null);
        showGlobalHint(globalHint, '', null);
        recomputeCanSubmit();

        // 2) Ocultar form y mostrar mensaje centrado
        form.style.display = 'none';
        if (successEl) {
          successEl.style.display = 'block';
          successEl.textContent = t('successMessage');
        }
      } catch (e) {
        console.error('[Register] signUp error', e);
        var msg;

        if (e && typeof e.message === 'string' && /already.*registered/i.test(e.message)) {
          msg = t('emailExists');
        } else {
          msg = e && e.message ? e.message : t('hintErrorGeneric');
        }

        showGlobalHint(globalHint, msg, 'error');
      } finally {
        setBusy(false);
        if (window.SystemLoader && typeof window.SystemLoader.hide === 'function') {
          window.SystemLoader.hide();
        }
      }
    });

    // estado inicial
    recomputeCanSubmit();

    // Si cambia idioma mientras estás en Registro
    window.addEventListener('i18n:changed', function () {
      applyTexts(root);
      recomputeCanSubmit();
    });
  }

  return { render: render };
})();
