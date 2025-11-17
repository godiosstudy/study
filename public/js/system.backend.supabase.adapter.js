// system.backend.supabase.adapter.js – integración con Supabase
;(function () {
  // Puedes exponer estas variables en window o por env inyectados por Vercel
  var SUPABASE_URL =
    (typeof window !== 'undefined' && (window.SUPABASE_URL || window.VITE_SUPABASE_URL)) ||
    '';
  var SUPABASE_ANON_KEY =
    (typeof window !== 'undefined' && (window.SUPABASE_ANON_KEY || window.VITE_SUPABASE_ANON_KEY)) ||
    '';

  var client = null;
  var currentSession = null;

  function hasConfig() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
    // Evitar usar el placeholder típico
    if (SUPABASE_URL.indexOf('your-ref.supabase.co') !== -1) return false;
    return true;
  }

  function init() {
    if (client) return client;

    if (!hasConfig()) {
      console.warn(
        '[Supabase] Config no definida. Asigna SUPABASE_URL / SUPABASE_ANON_KEY o VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.',
      );
      return null;
    }

    if (!window.supabase) {
      console.error(
        '[Supabase] SDK not found. Include: <script src="https://unpkg.com/@supabase/supabase-js@2"></script>',
      );
      return null;
    }

    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    client.auth.onAuthStateChange(function (event, session) {
      currentSession = session || null;
      try {
        window.dispatchEvent(
          new CustomEvent('auth:changed', { detail: currentSession }),
        );
      } catch (e) {}
    });

    refreshSession();
    return client;
  }

  async function refreshSession() {
    if (!client) init();
    if (!client) return null;
    try {
      var res = await client.auth.getSession();
      if (res.error) throw res.error;
      currentSession = (res.data && res.data.session) || null;
      try {
        window.dispatchEvent(
          new CustomEvent('auth:changed', { detail: currentSession }),
        );
      } catch (e) {}
      return currentSession;
    } catch (e) {
      console.warn('[Supabase] getSession failed', e);
      return null;
    }
  }

  async function signUp(args) {
    if (!client) init();
    if (!client) throw new Error('[Supabase] Not configured');

    var email = args.email;
    var password = args.password;
    var profile = args.profile || {};

    var res = await client.auth.signUp({
      email: email,
      password: password,
      options: {
        data: profile,
      },
    });

    if (res.error) throw res.error;

    await refreshSession();
    return res.data;
  }

  async function signIn(args) {
    if (!client) init();
    if (!client) throw new Error('[Supabase] Not configured');

    var email = args.email;
    var password = args.password;

    var res = await client.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (res.error) throw res.error;

    await refreshSession();
    return res.data;
  }

  async function signOut() {
    if (!client) init();
    if (!client) return;
    var res = await client.auth.signOut();
    if (res.error) throw res.error;
    currentSession = null;
    try {
      window.dispatchEvent(new CustomEvent('auth:changed', { detail: null }));
    } catch (e) {}
    return true;
  }

  async function getSession() {
    return refreshSession();
  }

  var AuthSession = {
    isLoggedIn: function () {
      return !!(currentSession && currentSession.user);
    },
    getUser: function () {
      return currentSession ? currentSession.user : null;
    },
    clear: function () {
      return signOut();
    },
    refresh: refreshSession,
  };

  // inicializar
  init();

  window.BackendSupabase = {
    init: init,
    client: function () {
      return client || init();
    },
    isConfigured: hasConfig,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
  };

  window.AuthSession = AuthSession;
})();
