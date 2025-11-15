// public/js/backend.supabase.adapter.js
;(function(){
  // Requires SDK before this file:
  // <script src="https://unpkg.com/@supabase/supabase-js@2"></script>

  var SUPABASE_URL = (typeof window !== 'undefined' && window.VITE_SUPABASE_URL) || '';
  var SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.VITE_SUPABASE_ANON_KEY) || '';

  if (!window.supabase) {
    console.error('[Supabase] SDK not found. Include: <script src="https://unpkg.com/@supabase/supabase-js@2"></script>');
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[Supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY globals.');
    return;
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function currentLang(){
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === 'function') {
        var prefs = window.PrefsStore.load();
        if (prefs && prefs.language) return prefs.language;
      }
    } catch (e){}
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
    }
    return 'es';
  }

  async function signUp(args){
    var name = args.name;
    var email = args.email;
    var password = args.password;
    var lang = args.lang || currentLang();
    var redirectTo = (window.APP_BASE_URL || window.location.origin) + '/';

    var res = await client.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { full_name: name, lang: lang },
        emailRedirectTo: redirectTo
      }
    });
    if (res.error) throw res.error;
    return res.data;
  }

  async function signIn(args){
    var email = args.email;
    var password = args.password;
    var res = await client.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;
  }

  async function signOut(){
    var res = await client.auth.signOut();
    if (res.error) throw res.error;
    return true;
  }

  async function session(){
    var res = await client.auth.getSession();
    if (res.error) throw res.error;
    return (res.data && res.data.session) || null;
  }

  // API esperada por el UI
  window.App = window.App || {};
  window.App.Auth = {
    client: client,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    session: session
  };

  // El registro usa Profiles.create y Profiles.existsByEmail
  window.App.Profiles = {
    async existsByEmail(/*email*/) {
      // Con Supabase dejamos que signUp lance error si el mail ya existe
      return false;
    },
    async create(payload) {
      var name = payload.name;
      var email = payload.email;
      var password = payload.password;
      var lang = currentLang();
      return await signUp({ name: name, email: email, password: password, lang: lang });
    }
  };

  // Supabase ya envía correo de validación; aquí no hacemos nada
  window.App.Mailer = {
    async sendValidation(/*email, token*/){
      // No-op
    }
  };

  // Notificar estado de auth inicial al UI
  (async function init(){
    try {
      var s = await session();
      window.dispatchEvent(new CustomEvent('auth:changed', { detail: s }));
    } catch (e) {
      console.warn('[Supabase] session() failed on init', e);
    }
  })();
})();
