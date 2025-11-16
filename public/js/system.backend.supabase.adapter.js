// system.backend.supabase.adapter.js – adapter de backend (stub)
window.BackendSupabase = (function () {
  function init() {
    // Aquí se inicializaría supabase.createClient(...)
    console.info("BackendSupabase.init() stub");
  }

  async function signIn(email, password) {
    console.warn("BackendSupabase.signIn stub", email);
    throw new Error("Supabase signIn no implementado aún.");
  }

  async function signOut() {
    console.warn("BackendSupabase.signOut stub");
  }

  async function getSession() {
    console.warn("BackendSupabase.getSession stub");
    return null;
  }

  return {
    init: init,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
  };
})();
