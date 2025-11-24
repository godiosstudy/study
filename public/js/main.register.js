// main.register.js – Registro en 3 pasos con validación de correo y código
window.MainRegister = (function () {
  // ----------------- Utilidades de idioma -----------------
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
      titleStep1: 'Registrarse',
      titleStep2: 'Confirma tu correo',
      titleStep3: 'Crea tu contraseña',

      nameLabel: 'Nombre',
      namePlaceholder: 'Nombre',
      emailLabel: 'Correo',
      emailPlaceholder: 'Correo',
      nameRequired: 'Debes ingresar tu nombre.',
      nameCounter: '{used} / {max}',

      emailInvalid: 'Debes ingresar un correo válido.',
      emailTaken: 'Este correo ya está registrado.',
      emailChecking: 'Comprobando correo…',
      emailAvailable: 'Este correo está disponible.',

      codeLabel: 'Código de verificación',
      codePlaceholder: 'Código',
      codeHint: 'Hemos enviado un código a {email}.',
      codeInvalid: 'El código no es correcto.',
      codeRequired: 'Debes ingresar el código de verificación.',

      resendLabel: 'Reenviar correo con código',
      resendSending: 'Enviando código…',
      resendLimit: 'Ya hemos enviado 3 códigos. Espera 1 minuto y vuelve a intentarlo.',
      resendOk: 'Hemos reenviado el código.',

      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Contraseña',
      passwordRequired: 'Debes ingresar una contraseña.',
      passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',

      legalText:
        'Al registrarte, aceptas los Términos del servicio y la Política de privacidad, incluido el uso de cookies. ' +
        'GODiOS puede usar tu información de contacto, incluido tu correo electrónico y número de teléfono, ' +
        'para los fines descritos en nuestra Política de privacidad, como mantener tu cuenta segura y personalizar ' +
        'nuestros servicios. Otros podrán encontrarte por tu correo o número de teléfono, si lo proporcionas, ' +
        'a menos que lo cambies en la configuración de tu cuenta.',

      btnCancel: 'Cancelar',
      btnCreate: 'Crear cuenta',
      btnNext: 'Siguiente',
      btnSignUp: 'Registrarse',

      errorRequired: 'Debes completar los campos obligatorios.',
      errorGeneric: 'No fue posible completar el registro. Intenta nuevamente.',
      successRegistered: 'Tu cuenta se ha creado correctamente. Ahora puedes iniciar sesión.',
      haveAccount: '¿Ya tienes cuenta? Inicia sesión aquí.'
    },
    en: {
      titleStep1: 'Create your account',
      titleStep2: 'Confirm your email',
      titleStep3: 'Create your password',

      nameLabel: 'Name',
      namePlaceholder: 'Name',
      emailLabel: 'Email',
      emailPlaceholder: 'Email',
      nameRequired: 'You must enter your name.',
      nameCounter: '{used} / {max}',

      emailInvalid: 'Please enter a valid email.',
      emailTaken: 'This email is already registered.',
      emailChecking: 'Checking email…',
      emailAvailable: 'This email is available.',

      codeLabel: 'Verification code',
      codePlaceholder: 'Verification code',
      codeHint: 'We have sent a code to {email}.',
      codeInvalid: 'The code is not correct.',
      codeRequired: 'You must enter the verification code.',

      resendLabel: 'Resend email with code',
      resendSending: 'Sending code…',
      resendLimit: 'We already sent 3 codes. Please wait 1 minute and try again.',
      resendOk: 'We have resent the code.',

      passwordLabel: 'Password',
      passwordPlaceholder: 'Password',
      passwordRequired: 'You must enter a password.',
      passwordTooShort: 'Password must be at least 8 characters long.',

      legalText:
        'By signing up, you agree to the Terms of Service and Privacy Policy, including Cookie Use. ' +
        'GODiOS may use your contact information, including your email address and phone number, ' +
        'for purposes outlined in our Privacy Policy, like keeping your account secure and personalizing ' +
        'our services. Others will be able to find you by email or phone number, when provided, ' +
        'unless you choose otherwise in your account settings.',

      btnCancel: 'Cancel',
      btnCreate: 'Create account',
      btnNext: 'Next',
      btnSignUp: 'Sign up',

      errorRequired: 'You must fill the required fields.',
      errorGeneric: 'We could not complete your registration. Please try again.',
      successRegistered: 'Your account has been created. You can sign in now.',
      haveAccount: 'Already have an account? Sign in here.'
    }
  };

  function t(key) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || TEXTS.es[key] || key;
  }

  // ----------------- Helpers de validación -----------------
  function isValidEmail(email) {
    if (!email) return false;
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).trim());
  }

  function deriveUsername(name, email) {
    var base = '';
    if (name) {
      base = String(name)
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9._-]/g, '');
    }
    if (!base && email) {
      base = String(email).split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
    }
    if (!base) base = 'user';
    return base.slice(0, 32);
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

  // ----- Supabase helpers -----
  async function checkEmailExists(email) {
    if (!email) return null;

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
      if (res && res.error) {
        console.warn('[Register] email_exists error', res.error);
        return null;
      }
      return !!(res && res.data);
    } catch (e) {
      console.warn('[Register] email_exists exception', e);
      return null;
    }
  }

  // RPC que envía el código de verificación por correo (Resend + Supabase)
  async function sendVerificationCode(email, name) {
    if (
      !window.BackendSupabase ||
      typeof window.BackendSupabase.client !== 'function' ||
      typeof window.BackendSupabase.isConfigured !== 'function' ||
      !window.BackendSupabase.isConfigured()
    ) {
      return { ok: false, error: 'not_configured' };
    }

    var client = window.BackendSupabase.client();
    if (!client) return { ok: false, error: 'no_client' };

    try {
      var payload = {
        p_email: email,
        p_name: name || null,
        p_lang: getLang()
      };
      var res = await client.rpc('register_send_code', payload);
      if (res && res.error) {
        console.warn('[Register] register_send_code error', res.error);
        return { ok: false, error: res.error.message || 'rpc_error' };
      }
      return { ok: true };
    } catch (e) {
      console.warn('[Register] sendVerificationCode exception', e);
      return { ok: false, error: 'exception' };
    }
  }

  // RPC que valida el código de verificación
  async function verifyCode(email, code) {
    if (!code) return { ok: false, error: 'empty' };

    if (
      !window.BackendSupabase ||
      typeof window.BackendSupabase.client !== 'function' ||
      typeof window.BackendSupabase.isConfigured !== 'function' ||
      !window.BackendSupabase.isConfigured()
    ) {
      return { ok: false, error: 'not_configured' };
    }

    var client = window.BackendSupabase.client();
    if (!client) return { ok: false, error: 'no_client' };

    try {
      var payload = { p_email: email, p_code: code };
      var res = await client.rpc('register_verify_code', payload);
      if (res && res.error) {
        console.warn('[Register] register_verify_code error', res.error);
        return { ok: false, error: res.error.message || 'rpc_error' };
      }
      var isValid = !!(res && res.data);
      return { ok: isValid, error: isValid ? null : 'invalid' };
    } catch (e) {
      console.warn('[Register] verifyCode exception', e);
      return { ok: false, error: 'exception' };
    }
  }

  async function doFinalSignUp(email, password, name) {
    if (!window.BackendSupabase || typeof window.BackendSupabase.signUp !== 'function') {
      throw new Error('[Register] Supabase not configured');
    }
    var username = deriveUsername(name, email);
    var lang = getLang();

    return window.BackendSupabase.signUp({
      email: email,
      password: password,
      profile: {
        first_name: name || null,
        language: lang || 'es',
        username: username || null
      }
    });
  }

  // ----------------- Render -----------------
  function applyTexts(root, step) {
    if (!root) return;
    var titleEl = root.querySelector('#reg-title');
    var nameLabel = root.querySelector('#lbl-reg-name');
    var emailLabel = root.querySelector('#lbl-reg-email');
    var codeLabel = root.querySelector('#lbl-reg-code');
    var passwordLabel = root.querySelector('#lbl-reg-password');
    var cancelBtn = root.querySelector('#reg-btn-cancel');
    var createBtn = root.querySelector('#reg-btn-create');
    var step2Next = root.querySelector('#reg-btn-step2-next');
    var step3Sign = root.querySelector('#reg-btn-signup');
    var resendLink = root.querySelector('#reg-resend-link');
    var legalEl = root.querySelector('#reg-legal');

    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;

    if (titleEl) {
      var titleKey = step === 2 ? 'titleStep2' : step === 3 ? 'titleStep3' : 'titleStep1';
      titleEl.textContent = dict[titleKey];
    }

    if (nameLabel) nameLabel.textContent = dict.nameLabel;
    if (emailLabel) emailLabel.textContent = dict.emailLabel;
    if (codeLabel) codeLabel.textContent = dict.codeLabel;
    if (passwordLabel) passwordLabel.textContent = dict.passwordLabel;
    if (cancelBtn) cancelBtn.textContent = dict.btnCancel;
    if (createBtn) createBtn.textContent = dict.btnCreate;
    if (step2Next) step2Next.textContent = dict.btnNext;
    if (step3Sign) step3Sign.textContent = dict.btnSignUp;
    if (resendLink) resendLink.textContent = dict.resendLabel;
    if (legalEl) legalEl.textContent = dict.legalText;

    // Placeholders
    var nameInput = root.querySelector('#reg-name');
    var emailInput = root.querySelector('#reg-email');
    var codeInput = root.querySelector('#reg-code');
    var passInput = root.querySelector('#reg-password');

    var loginLink = root.querySelector('#reg-login-link');
    if (loginLink && dict.haveAccount) {
      loginLink.textContent = dict.haveAccount;
    }
}

  function render(container) {
    if (!container) return;
    container.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'panel panel-single register-panel';

    var html = [
      '<div class="main-view-header">',
      '  <h1 class="main-view-title" id="reg-title"></h1>',
      '</div>',
      '',
      '<div class="register-card">',
      '  <!-- Paso 1: nombre + correo -->',
      '  <div class="register-step" id="reg-step-1">',
      '    <div class="reg-field" data-field="name">',
      '      <input type="text" id="reg-name" maxlength="50" autocomplete="name" />',
      '      <label for="reg-name" id="lbl-reg-name"></label>',
      '      <div class="reg-counter" id="reg-name-counter"></div>',
      '      <p class="field-hint" id="reg-name-hint"></p>',
      '    </div>',
      '    <div class="reg-field" data-field="email">',
      '      <input type="email" id="reg-email" autocomplete="email" />',
      '      <label for="reg-email" id="lbl-reg-email"></label>',
      '      <p class="field-hint" id="reg-email-hint"></p>',
      '    </div>',
      '    <div class="register-actions">',
      '      <button type="button" class="chip" id="reg-btn-cancel"></button>',
      '      <button type="button" class="chip primary" id="reg-btn-create" disabled></button>',
      '    </div>',
      '  </div>',
      '',
      '  <!-- Paso 2: código de verificación -->',
      '  <div class="register-step" id="reg-step-2" style="display:none;">',
      '    <p class="field-hint" id="reg-code-hint"></p>',
      '    <div class="reg-field" data-field="code">',
      '      <input type="text" id="reg-code" inputmode="numeric" autocomplete="one-time-code" />',
      '      <label for="reg-code" id="lbl-reg-code"></label>',
      '      <p class="field-hint" id="reg-code-error"></p>',
      '    </div>',
      '    <button type="button" class="chip link-like" id="reg-resend-link"></button>',
      '    <div class="register-actions single">',
      '      <button type="button" class="chip primary" id="reg-btn-step2-next" disabled></button>',
      '    </div>',
      '  </div>',
      '',
      '  <!-- Paso 3: contraseña -->',
      '  <div class="register-step" id="reg-step-3" style="display:none;">',
      '    <div class="reg-field" data-field="password">',
      '      <input type="password" id="reg-password" autocomplete="new-password" />',
      '      <label for="reg-password" id="lbl-reg-password"></label>',
      '      <p class="field-hint" id="reg-password-hint"></p>',
      '    </div>',
      '    <p class="reg-legal" id="reg-legal"></p>',
      '    <div class="register-actions single">',
      '      <button type="button" class="chip primary" id="reg-btn-signup" disabled></button>',
      '    </div>',
      '  </div>',
      '</div>',
      '',
      '<p class="field-hint" id="reg-global-hint"></p>',
      '<p class="register-login-link"><button type="button" id="reg-login-link" class="link-like"></button></p>'
    ].join('\n');

    wrap.innerHTML = html;
    container.appendChild(wrap);

    applyTexts(wrap, 1);
    wireLogic(wrap);
  }

  // ----------------- Lógica de pasos -----------------
  function wireLogic(root) {
    var state = {
      step: 1,
      name: '',
      email: '',
      code: '',
      password: '',
      emailStatus: 'empty', // empty | invalid | checking | taken | ok
      resendCount: 0,
      isSendingCode: false,
      isVerifyingCode: false,
      isSigningUp: false
    };

    var nameInput = root.querySelector('#reg-name');
    var emailInput = root.querySelector('#reg-email');
    var codeInput = root.querySelector('#reg-code');
    var passInput = root.querySelector('#reg-password');


    var loginLink = root.querySelector('#reg-login-link');
    if (loginLink) {
      loginLink.addEventListener('click', function () {
        if (window.Router && typeof window.Router.go === 'function') {
          window.Router.go('login');
        } else if (window.MainLogin && typeof window.MainLogin.render === 'function') {
          var cont = document.getElementById('app-main');
          window.MainLogin.render(cont);
        }
      });
    }

    var nameCounter = root.querySelector('#reg-name-counter');
    var nameHint = root.querySelector('#reg-name-hint');
    var emailHint = root.querySelector('#reg-email-hint');
    var codeHint = root.querySelector('#reg-code-hint');
    var codeError = root.querySelector('#reg-code-error');
    var passHint = root.querySelector('#reg-password-hint');
    var globalHint = root.querySelector('#reg-global-hint');

    var cancelBtn = root.querySelector('#reg-btn-cancel');
    var createBtn = root.querySelector('#reg-btn-create');
    var step2Next = root.querySelector('#reg-btn-step2-next');
    var resendLink = root.querySelector('#reg-resend-link');
    var signUpBtn = root.querySelector('#reg-btn-signup');

    function setFieldError(fieldEl, hasError) {
      if (!fieldEl) return;
      if (hasError) fieldEl.classList.add('error');
      else fieldEl.classList.remove('error');
    }

    function updateNameCounter() {
      if (!nameInput || !nameCounter) return;
      var used = (nameInput.value || '').length;
      var max = nameInput.maxLength || 50;
      var template = t('nameCounter');
      nameCounter.textContent = template
        .replace('{used}', String(used))
        .replace('{max}', String(max));
    }

    function markHasValue(inputEl) {
      if (!inputEl) return;
      var wrap = inputEl.closest('.reg-field');
      if (!wrap) return;
      var hasVal = !!inputEl.value;
      if (hasVal) wrap.classList.add('has-value');
      else wrap.classList.remove('has-value');
    }

    function recomputeStep1() {
      var nameOk = !!state.name;
      var emailOk = state.emailStatus === 'ok';
      if (createBtn) {
        createBtn.disabled = !(nameOk && emailOk && !state.isSendingCode);
      }
    }

    function recomputeStep2() {
      var codeOk = !!state.code;
      if (step2Next) {
        step2Next.disabled = !(codeOk && !state.isVerifyingCode);
      }
    }

    function recomputeStep3() {
      var passOk = !!state.password && state.password.length >= 8;
      if (signUpBtn) {
        signUpBtn.disabled = !(passOk && !state.isSigningUp);
      }
    }

    // ----- Paso 1: nombre + correo -----
    if (nameInput) {
      updateNameCounter();
      markHasValue(nameInput);
      nameInput.addEventListener('input', function () {
        state.name = (nameInput.value || '').trim();
        markHasValue(nameInput);
        updateNameCounter();

        if (!state.name) {
          showFieldHint(nameHint, t('nameRequired'), 'error');
          setFieldError(nameInput.closest('.reg-field'), true);
        } else {
          showFieldHint(nameHint, '', null);
          setFieldError(nameInput.closest('.reg-field'), false);
        }
        recomputeStep1();
      });
    }

    var emailCheckTimeout = null;
    if (emailInput) {
      markHasValue(emailInput);
      emailInput.addEventListener('input', function () {
        state.email = (emailInput.value || '').trim();
        markHasValue(emailInput);

        state.emailStatus = 'empty';
        showFieldHint(emailHint, '', null);
        setFieldError(emailInput.closest('.reg-field'), false);
        recomputeStep1();

        if (!state.email) {
          state.emailStatus = 'empty';
          return;
        }
        if (!isValidEmail(state.email)) {
          state.emailStatus = 'invalid';
          showFieldHint(emailHint, t('emailInvalid'), 'error');
          setFieldError(emailInput.closest('.reg-field'), true);
          recomputeStep1();
          return;
        }

        state.emailStatus = 'checking';
        showFieldHint(emailHint, t('emailChecking'), null);

        if (emailCheckTimeout) window.clearTimeout(emailCheckTimeout);
        emailCheckTimeout = window.setTimeout(async function () {
          var exists = await checkEmailExists(state.email);
          if (state.email !== (emailInput.value || '').trim()) {
            return; // el usuario cambió el texto
          }
          if (exists === true) {
            state.emailStatus = 'taken';
            showFieldHint(emailHint, t('emailTaken'), 'error');
            setFieldError(emailInput.closest('.reg-field'), true);
          } else if (exists === false) {
            state.emailStatus = 'ok';
            showFieldHint(emailHint, t('emailAvailable'), 'ok');
            setFieldError(emailInput.closest('.reg-field'), false);
          } else {
            state.emailStatus = 'ok';
            showFieldHint(emailHint, '', null);
            setFieldError(emailInput.closest('.reg-field'), false);
          }
          recomputeStep1();
        }, 400);
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        if (window.Main && typeof window.Main.showView === 'function') {
          window.Main.showView('navigator');
        }
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', async function () {
        if (createBtn.disabled) return;

        if (!state.name || !state.email || state.emailStatus !== 'ok') {
          showGlobalHint(globalHint, t('errorRequired'), 'error');
          return;
        }

        state.isSendingCode = true;
        recomputeStep1();
        showGlobalHint(globalHint, '', null);

        try {
          var res = await sendVerificationCode(state.email, state.name);
          if (!res.ok) {
            showGlobalHint(globalHint, t('errorGeneric'), 'error');
            state.isSendingCode = false;
            recomputeStep1();
            return;
          }

          state.step = 2;
          state.resendCount = 1;
          // Mostrar paso 2
          root.querySelector('#reg-step-1').style.display = 'none';
          root.querySelector('#reg-step-2').style.display = 'block';
          applyTexts(root, 2);

          if (codeHint) {
            var msg = t('codeHint').replace('{email}', state.email);
            showFieldHint(codeHint, msg, null);
          }
          showGlobalHint(globalHint, '', null);
          if (codeInput) codeInput.focus();
        } catch (e) {
          console.error('[Register] sendVerificationCode failed', e);
          showGlobalHint(globalHint, t('errorGeneric'), 'error');
        } finally {
          state.isSendingCode = false;
          recomputeStep1();
        }
      });
    }

    // ----- Paso 2: código de verificación -----
    if (codeInput) {
      markHasValue(codeInput);
      codeInput.addEventListener('input', function () {
        state.code = (codeInput.value || '').trim();
        markHasValue(codeInput);
        showFieldHint(codeError, '', null);
        setFieldError(codeInput.closest('.reg-field'), false);
        recomputeStep2();
      });
    }

    if (resendLink) {
      resendLink.addEventListener('click', async function () {
        if (state.resendCount >= 3 || state.isSendingCode) {
          showFieldHint(codeHint, t('resendLimit'), 'error');
          return;
        }
        state.isSendingCode = true;
        showFieldHint(codeHint, t('resendSending'), null);
        try {
          var res2 = await sendVerificationCode(state.email, state.name);
          if (!res2.ok) {
            showFieldHint(codeHint, t('errorGeneric'), 'error');
          } else {
            state.resendCount += 1;
            showFieldHint(codeHint, t('resendOk'), 'ok');
          }
        } catch (e) {
          console.error('[Register] resend code error', e);
          showFieldHint(codeHint, t('errorGeneric'), 'error');
        } finally {
          state.isSendingCode = false;
          recomputeStep2();
        }
      });
    }

    if (step2Next) {
      step2Next.addEventListener('click', async function () {
        if (step2Next.disabled) return;
        if (!state.code) {
          showFieldHint(codeError, t('codeRequired'), 'error');
          setFieldError(codeInput && codeInput.closest('.reg-field'), true);
          return;
        }

        state.isVerifyingCode = true;
        recomputeStep2();
        showFieldHint(codeError, '', null);

        try {
          var res3 = await verifyCode(state.email, state.code);
          if (!res3.ok) {
            showFieldHint(codeError, t('codeInvalid'), 'error');
            setFieldError(codeInput && codeInput.closest('.reg-field'), true);
            state.isVerifyingCode = false;
            recomputeStep2();
            return;
          }

          state.step = 3;
          root.querySelector('#reg-step-2').style.display = 'none';
          root.querySelector('#reg-step-3').style.display = 'block';
          applyTexts(root, 3);
          showGlobalHint(globalHint, '', null);
          if (passInput) passInput.focus();
        } catch (e) {
          console.error('[Register] verify code error', e);
          showFieldHint(codeError, t('errorGeneric'), 'error');
        } finally {
          state.isVerifyingCode = false;
          recomputeStep2();
        }
      });
    }

    // ----- Paso 3: contraseña -----
    if (passInput) {
      markHasValue(passInput);
      passInput.addEventListener('input', function () {
        state.password = passInput.value || '';
        markHasValue(passInput);

        if (!state.password) {
          showFieldHint(passHint, t('passwordRequired'), 'error');
          setFieldError(passInput.closest('.reg-field'), true);
        } else if (state.password.length < 8) {
          showFieldHint(passHint, t('passwordTooShort'), 'error');
          setFieldError(passInput.closest('.reg-field'), true);
        } else {
          showFieldHint(passHint, '', null);
          setFieldError(passInput.closest('.reg-field'), false);
        }
        recomputeStep3();
      });
    }

    if (signUpBtn) {
      signUpBtn.addEventListener('click', async function () {
        if (signUpBtn.disabled) return;
        if (!state.password || state.password.length < 8) {
          showFieldHint(passHint, t('passwordTooShort'), 'error');
          setFieldError(passInput && passInput.closest('.reg-field'), true);
          return;
        }

        state.isSigningUp = true;
        recomputeStep3();
        showGlobalHint(globalHint, '', null);

        try {
          await doFinalSignUp(state.email, state.password, state.name);

          showGlobalHint(globalHint, t('successRegistered'), 'ok');
          // opcional: redirigir a login
          try {
            if (window.Main && typeof window.Main.showView === 'function') {
              window.Main.showView('login');
            }
          } catch (e) {}
        } catch (e) {
          console.error('[Register] final signUp error', e);
          showGlobalHint(globalHint, t('errorGeneric'), 'error');
        } finally {
          state.isSigningUp = false;
          recomputeStep3();
        }
      });
    }

    // Ajustar textos si cambia idioma
    window.addEventListener('i18n:changed', function () {
      applyTexts(root, state.step || 1);
      updateNameCounter();
    });
  }

  return { render: render };
})();
