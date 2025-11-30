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
  var currentRoles = [];

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
      (async function () {
        currentSession = session || null;
        if (currentSession && currentSession.user && currentSession.user.id) {
          await loadUserRoles(currentSession.user.id);
          injectRolesIntoSession(currentSession);
        } else {
          currentRoles = [];
        }
        try {
          window.dispatchEvent(
            new CustomEvent('auth:changed', { detail: currentSession }),
          );
        } catch (e) {}
      })();
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
      if (currentSession && currentSession.user && currentSession.user.id) {
        await loadUserRoles(currentSession.user.id);
        injectRolesIntoSession(currentSession);
      } else {
        currentRoles = [];
      }
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
    currentRoles = [];
    try {
      window.dispatchEvent(new CustomEvent('auth:changed', { detail: null }));
    } catch (e) {}
    return true;
  }

  async function getSession() {
    return refreshSession();
  }

  // Carga los roles del usuario desde public.user_roles, sin JOIN con roles
  async function loadUserRoles(userId) {
    currentRoles = [];
    if (!userId) return currentRoles;
    if (!client) init();
    if (!client) return currentRoles;

    try {
      var query = client
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      var res = await query;
      if (res && res.error) {
        console.warn('[Auth] error leyendo user_roles', res.error);
        return currentRoles;
      }

      currentRoles =
        (res.data || []).map(function (row) {
          var id = row.role_id;
          var code = null;

          // Map estático según la tabla roles:
          // 1 = i (SuperAdmin), 2 = admin, 3 = participant
          if (id === 1) code = 'i';
          else if (id === 2) code = 'admin';
          else if (id === 3) code = 'participant';

          return {
            role_id: id,
            id: id,
            code: code,
          };
        }) || [];
    } catch (e) {
      console.warn('[Auth] getUserRoles exception', e);
    }

    return currentRoles;
  }

  function injectRolesIntoSession(session) {
    if (!session || !session.user) return session;
    var meta = session.user.user_metadata || {};
    var flat = Array.isArray(meta.roles) ? meta.roles.slice() : [];

    currentRoles.forEach(function (r) {
      if (r.role_id != null) flat.push(r.role_id);
      if (r.id != null && r.id !== r.role_id) flat.push(r.id);
      if (r.code) flat.push(r.code);
    });

    // dedupe
    var seen = {};
    meta.roles = flat.filter(function (v) {
      var key = String(v);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });

    session.user.user_metadata = meta;
    return session;
  }

  async function getUserRoles(userId) {
    var uid = userId;
    if (!uid && currentSession && currentSession.user) {
      uid = currentSession.user.id;
    }
    return loadUserRoles(uid);
  }

  var AuthSession = {
    isLoggedIn: function () {
      return !!(currentSession && currentSession.user);
    },
    getUser: function () {
      return currentSession ? currentSession.user : null;
    },
    getRoles: function () {
      var flat = [];
      currentRoles.forEach(function (r) {
        if (r && typeof r === 'object') {
          if (r.role_id != null) flat.push(r.role_id);
          if (r.id != null && r.id !== r.role_id) flat.push(r.id);
          if (r.code) flat.push(r.code);
        } else if (r != null) {
          flat.push(r);
        }
      });
      return flat;
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
    getUserRoles: getUserRoles,
  };

  window.AuthSession = AuthSession;
})();
