// public/js/backend.supabase.adapter.js
;(function(){
  // Requires SDK before this file:
  // <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
  const SUPABASE_URL =
    (typeof import !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL)
    || (window && window.VITE_SUPABASE_URL);
  const SUPABASE_ANON_KEY =
    (typeof import !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY)
    || (window && window.VITE_SUPABASE_ANON_KEY);

  if (!window.supabase) {
    console.error('[Supabase] SDK not found. Include: <script src=\"https://unpkg.com/@supabase/supabase-js@2\"></script>');
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[Supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY envs.');
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function currentLang(){
    try { return (window.PrefsStore && window.PrefsStore.load && window.PrefsStore.load().language) || 'es'; }
    catch { return 'es'; }
  }

  async function signUp({ name, email, password, lang }){
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: (window.APP_BASE_URL || 'https://study.godios.org'),
        data: { first_name: name, lang: (lang || currentLang() || 'es') }
      }
    });
    if (error) throw error;
    return data;
  }

  async function signIn({ email, password }){
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut(){
    const { error } = await client.auth.signOut();
    if (error) throw error;
    return true;
  }

  async function session(){
    const { data: { session } } = await client.auth.getSession();
    return session || null;
  }

  window.App = window.App || {};
  window.App.Auth = { client, signUp, signIn, signOut, session };

  // Keep previous UI contract:
  window.App.Profiles = {
    async existsByEmail(){ return false; }, // Supabase returns error if email already registered
    async create({ name, email, password }){
      const lang = currentLang();
      return await signUp({ name, email, password, lang });
    }
  };
  window.App.Mailer = { async sendValidation(){ /* Supabase sends email via SMTP */ } };

  // Notify UI on load
  (async function init(){
    const s = await session();
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: s }));
  })();
})();
