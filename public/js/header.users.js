;(function () {
  const bus = window;
  const LS_KEY = "auth.user";

  function loadPrefs() {
    try {
      return window.PrefsStore && window.PrefsStore.load
        ? window.PrefsStore.load()
        : null;
    } catch {
      return null;
    }
  }

  function currentLang() {
    const prefs = loadPrefs();
    return (prefs && prefs.language) || "es";
  }

  function t(path, fallback) {
    const lang = currentLang();
    const TR = window.I18n && window.I18n.__TR;
    let cur = TR && TR[lang];

    if (cur && path) {
      const parts = path.split(".");
      for (const p of parts) {
        if (cur == null) break;
        cur = cur[p];
      }
    }

    if (cur != null && cur !== "") return cur;
    return fallback || path;
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "null");
    } catch {
      return null;
    }
  }

  function setUser(u) {
    if (u) localStorage.setItem(LS_KEY, JSON.stringify(u));
    else localStorage.removeItem(LS_KEY);
    bus.dispatchEvent(new CustomEvent("auth:changed", { detail: u }));
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function")
        node.addEventListener(k.slice(2), v);
      else if (v != null) node.setAttribute(k, v);
    });
    children.forEach((c) => c && node.appendChild(c));
    return node;
  }

  function chip({ id, icon, label, onClick }) {
    const btn = el("button", {
      class: "chip icon-only",
      id,
      "aria-label": label,
      title: label,
    });

    const i = el("i", { "data-lucide": icon });
    const sr = el("span", { class: "sr-only", text: label });

    btn.appendChild(i);
    btn.appendChild(sr);

    if (typeof onClick === "function") {
      btn.addEventListener("click", onClick);
    }

    return btn;
  }

  function render() {
    const hdrRight = document.querySelector(".hdr-right");
    if (!hdrRight) return;

    // limpiar grupo anterior
    let group = hdrRight.querySelector(".hdr-actions");
    if (group) group.remove();
    group = el("div", { class: "hdr-actions" });

    const user = getUser();

    if (user) {
      // === LOGUEADO ===

      // Mi cuenta
      const accountLabel = t("buttons.myAccount", "My account");
      group.appendChild(
        chip({
          id: "hdr-account",
          icon: "user-pen",
          label: accountLabel,
          onClick: () => {
            if (
              window.UsersAccount &&
              typeof window.UsersAccount.open === "function"
            ) {
              window.UsersAccount.open(user);
            }
          },
        })
      );

      // Cerrar sesión
      const logoutLabel = t("buttons.logout", "Log out");
      group.appendChild(
        chip({
          id: "hdr-logout",
          icon: "log-out",
          label: logoutLabel,
          onClick: () => {
            if (
              window.UsersSignOut &&
              typeof window.UsersSignOut.run === "function"
            ) {
              window.UsersSignOut.run(setUser);
            } else {
              setUser(null);
            }
          },
        })
      );
    } else {
      // === INVITADO ===

      // Iniciar sesión
      const signInLabel = t("buttons.signIn", "Login");
      group.appendChild(
        chip({
          id: "hdr-signin",
          icon: "user-lock",
          label: signInLabel,
          onClick: () => {
            if (
              window.UsersLogin &&
              typeof window.UsersLogin.open === "function"
            ) {
              window.UsersLogin.open(setUser);
            }
          },
        })
      );

      // Registrarse
      const registerLabel = t("buttons.register", "Register");
      group.appendChild(
        chip({
          id: "hdr-register",
          icon: "user-plus",
          label: registerLabel,
          onClick: () => {
            if (
              window.UsersRegister &&
              typeof window.UsersRegister.open === "function"
            ) {
              window.UsersRegister.open(setUser);
            }
          },
        })
      );
    }

    // === PREFERENCIAS (siempre, icono "settings") ===
    let prefsBtn = hdrRight.querySelector("#hdr-preferences");
    const prefsLabel = t("buttons.preferences", "Preferences");

    if (!prefsBtn) {
      prefsBtn = chip({
        id: "hdr-preferences",
        icon: "settings",
        label: prefsLabel,
        onClick: () => {
          if (window.Prefs && typeof window.Prefs.open === "function") {
            window.Prefs.open();
          } else if (
            window.PrefsStore &&
            typeof window.PrefsStore.open === "function"
          ) {
            window.PrefsStore.open();
          }
        },
      });
    } else {
      // solo actualizamos texto/tooltip si el botón ya existe en el HTML
      prefsBtn.setAttribute("title", prefsLabel);
      prefsBtn.setAttribute("aria-label", prefsLabel);
      const sr = prefsBtn.querySelector(".sr-only");
      if (sr) sr.textContent = prefsLabel;
    }

    group.appendChild(prefsBtn);

    // quitar botón viejo de users si sigue ahí
    const oldUsers = hdrRight.querySelector("#hdr-users");
    if (oldUsers) oldUsers.remove();

    hdrRight.appendChild(group);

    // reconstruir íconos Lucide
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function init() {
    render();
    window.addEventListener("prefs:applied", render);
    window.addEventListener("auth:changed", render);
  }

  window.App = window.App || {};
  window.App.Users = { init, getUser, setUser };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
