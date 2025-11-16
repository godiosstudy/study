// system.backend.vercel.adapter.js – adapter para funciones/vercel (stub)
window.BackendVercel = (function () {
  async function call(endpoint, payload) {
    console.warn("BackendVercel.call stub", endpoint, payload);
    throw new Error("Vercel backend no implementado aún.");
  }

  return {
    call: call,
  };
})();
