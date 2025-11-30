// system.language.helper.js - funciones comunes para cambiar idioma
window.applyLanguageChange = async function (newLang) {
  // 1. guardar en perfil si hay usuario
  try {
    if (window.AuthSession && typeof window.AuthSession.getUser === "function") {
      var user = window.AuthSession.getUser();
      if (user && user.id && window.BackendSupabase && typeof window.BackendSupabase.client === "function") {
        var client = window.BackendSupabase.client();
        if (client) {
          await client.from("profiles").update({ p_language: newLang }).eq("id", user.id);
        }
      }
    }
  } catch (e) {
    console.warn("[LangChange] error updating p_language in profile", e);
  }

  // 2. guardar en dispositivo
  try {
    localStorage.setItem("gods_lang", newLang);
  } catch (e2) {}

  // 3. avisar al SystemLanguage
  try {
    if (window.SystemLanguage && typeof window.SystemLanguage.setCurrent === "function") {
      window.SystemLanguage.setCurrent(newLang);
    }
  } catch (e3) {}

  // 4. recargar diccionario de palabras
  try {
    if (window.SystemWords && typeof window.SystemWords.loadForLanguage === "function") {
      await window.SystemWords.loadForLanguage(newLang);
    }
  } catch (e4) {}

  // 5. avisar a la UI (header, menús, etc.) que cambió el idioma
  try {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang: newLang } }));
    }
    if (window.Toolbar && typeof window.Toolbar.refreshBreadcrumb === "function") {
      window.Toolbar.refreshBreadcrumb();
    }
    if (window.HeaderButtons && typeof window.HeaderButtons.render === "function") {
      var container = document.getElementById("hdr-actions");
      if (container) window.HeaderButtons.render(container);
    }
  } catch (eNotify) {
    console.warn("[LangChange] notify error", eNotify);
  }

  // 6. refrescar UI principal
  try {
    if (window.Main && typeof window.Main.refreshCurrentView === "function") {
      window.Main.refreshCurrentView();
    } else {
      window.location.reload();
    }
  } catch (e5) {
    window.location.reload();
  }
};
