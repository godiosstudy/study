;(function(){
  function t(path){
    const lang = (window.PrefsStore?.load()?.language) || 'es';
    const parts = (path||'').split('.');
    let cur = window.I18n && window.I18n.__TR && window.I18n.__TR[lang];
    for (const p of parts){ if (!cur) break; cur = cur[p]; }
    return cur ?? path;
  }

  function el(tag, attrs={}, children=[]){
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if (k==='class') n.className=v;
      else if (k==='text') n.textContent=v;
      else if (k==='html') n.innerHTML=v;
      else n.setAttribute(k,v);
    });
    children.forEach(c=>n.appendChild(c));
    return n;
  }

  function emailValid(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'').trim()); }

  async function checkEmailExists(email){
    try {
      if (window.App && window.App.Profiles && typeof window.App.Profiles.existsByEmail === 'function') {
        return !!(await window.App.Profiles.existsByEmail(email));
      }
    } catch(e){ console.warn('existsByEmail failed', e); }
    return false;
  }

  async function createProfile(data){
    try {
      if (window.App && window.App.Profiles && typeof window.App.Profiles.create === 'function') {
        return await window.App.Profiles.create(data);
      }
    } catch(e){ console.warn('Profiles.create failed', e); }
    const q = JSON.parse(localStorage.getItem('pending_regs')||'[]');
    q.push(data);
    localStorage.setItem('pending_regs', JSON.stringify(q));
    return data;
  }

  function sendValidationEmail(email, token){
    try {
      if (window.App && window.App.Mailer && typeof window.App.Mailer.sendValidation === 'function') {
        window.App.Mailer.sendValidation(email, token);
        return;
      }
    } catch(e){ console.warn('Mailer failed', e); }
    const url = location.origin + location.pathname + '?validate=' + encodeURIComponent(token);
    console.info('DEV validate link for', email, url);
  }

  function autoLoginFromToken(setUser){
    const params = new URLSearchParams(location.search);
    const token = params.get('validate');
    if (!token) return;
    const list = JSON.parse(localStorage.getItem('pending_regs')||'[]');
    const found = list.find(x=>x.token===token);
    if (found){
      const rest = list.filter(x=>x.token!==token);
      localStorage.setItem('pending_regs', JSON.stringify(rest));
      setUser && setUser({ id: crypto.randomUUID(), email: found.email, first_name: found.name });
      window.dispatchEvent(new CustomEvent('auth:changed', { detail: { id: 'local', email: found.email } }));
      try { history.replaceState(null, '', location.pathname); } catch {}
    }
  }

  function open(setUser){
    autoLoginFromToken(setUser);

    const overlay = el('div', { class: 'modal-overlay' });
    const dialog = el('div', { class: 'modal dialog' });
    const title = el('h2', { class: 'modal-title', text: t('users.register.title') });

    const form = el('form', { class: 'form-vert', novalidate: '' });

    const gName = el('div', { class: 'form-group' }, [
      el('label', { for: 'reg-name', text: t('users.register.fields.name') }),
      el('input', { id: 'reg-name', type: 'text', autocomplete: 'name', required: '' }),
      el('div', { class: 'field-hint', id: 'reg-name-hint' })
    ]);

    const gEmail = el('div', { class: 'form-group' }, [
      el('label', { for: 'reg-email', text: t('users.register.fields.email') }),
      el('input', { id: 'reg-email', type: 'email', autocomplete: 'email', required: '' }),
      el('div', { class: 'field-hint', id: 'reg-email-hint' })
    ]);

    const gPass = el('div', { class: 'form-group' }, [
      el('label', { for: 'reg-pass', text: t('users.register.fields.password') }),
      el('input', { id: 'reg-pass', type: 'password', autocomplete: 'new-password', required: '' }),
      el('div', { class: 'field-hint', id: 'reg-pass-hint' })
    ]);

    const actions = el('div', { class: 'form-actions' }, [
      el('button', { type: 'button', class: 'btn ghost', id: 'reg-cancel', text: t('users.register.actions.cancel') }),
      el('button', { type: 'submit', class: 'btn primary', id: 'reg-submit', text: t('users.register.actions.submit') })
    ]);

    form.appendChild(gName); form.appendChild(gEmail); form.appendChild(gPass); form.appendChild(actions);
    dialog.appendChild(title); dialog.appendChild(form);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    function close(){ overlay.remove(); }
    document.getElementById('reg-cancel').addEventListener('click', close);

    const inpEmail = document.getElementById('reg-email');
    const hintEmail = document.getElementById('reg-email-hint');

    async function validateEmailField(){
      const val = inpEmail.value.trim();
      hintEmail.textContent = '';
      hintEmail.className = 'field-hint';
      if (!emailValid(val)){
        hintEmail.textContent = t('users.register.errors.invalidEmail');
        hintEmail.classList.add('error');
        return false;
      }
      const taken = await checkEmailExists(val);
      if (taken){
        hintEmail.textContent = t('users.register.errors.emailTaken');
        hintEmail.classList.add('error');
        return false;
      }
      hintEmail.classList.add('ok');
      return true;
    }

    inpEmail.addEventListener('blur', ()=>{ validateEmailField(); });

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = (document.getElementById('reg-name').value||'').trim();
      const email = (document.getElementById('reg-email').value||'').trim();
      const password = (document.getElementById('reg-pass').value||'').trim();

      const okEmail = await validateEmailField();
      if (!name || !okEmail || !password) return;

      const token = crypto.randomUUID();
      await createProfile({ name, email, password, token, created_at: new Date().toISOString() });
      sendValidationEmail(email, token);

      alert(t('users.register.notice.sent'));
      close();
    });
  }

  window.UsersRegister = { open };
})();