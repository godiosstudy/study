// main.notifications.js – vista de notificaciones del usuario
window.MainNotifications = (function () {
  // ======================
  // Helpers de idioma
  // ======================
  function getLang() {
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === "function") {
        var prefs = window.PrefsStore.load();
        if (prefs && prefs.language) return prefs.language;
      }
    } catch (e) {}
    return "es";
  }

  var TEXTS = {
    es: {
      title: "Notificaciones",
      subtitleNoUser: "Necesitas iniciar sesión para ver tus notificaciones.",
      goLogin: "Ir a iniciar sesión",
      empty: "No tienes notificaciones todavía.",
      errorLoading: "No fue posible cargar tus notificaciones.",
      loadMore: "Ver más",
    },
    en: {
      title: "Notifications",
      subtitleNoUser: "You need to sign in to see your notifications.",
      goLogin: "Go to Sign in",
      empty: "You don't have any notifications yet.",
      errorLoading: "We could not load your notifications.",
      loadMore: "Load more",
    },
  };

  function t(key) {
    var lang = getLang();
    var dict = TEXTS[lang] || TEXTS.es;
    return dict[key] || key;
  }

  // ======================
  // Supabase / sesión
  // ======================
  function getSupabaseClient() {
    try {
      if (
        window.BackendSupabase &&
        typeof window.BackendSupabase.client === "function" &&
        typeof window.BackendSupabase.isConfigured === "function" &&
        window.BackendSupabase.isConfigured()
      ) {
        return window.BackendSupabase.client();
      }
    } catch (e) {
      console.warn("[Notifications] error obteniendo cliente Supabase", e);
    }
    return null;
  }

  function getCurrentUser() {
    try {
      if (
        window.AuthSession &&
        typeof window.AuthSession.getUser === "function"
      ) {
        return window.AuthSession.getUser();
      }
    } catch (e) {
      console.warn("[Notifications] error obteniendo usuario actual", e);
    }
    return null;
  }

  var PAGE_SIZE = 50;

  function formatDateISO(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return iso;
    }
  }

  async function markAllAsRead(client, userId) {
    try {
      var res = await client
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (res && res.error) {
        console.warn("[Notifications] error al marcar como leídas", res.error);
      }
    } catch (e) {
      console.warn("[Notifications] excepción al marcar como leídas", e);
    }

    try {
      window.dispatchEvent(new Event("auth:changed"));
    } catch (e) {}
  }

  function render(container) {
    if (!container) return;

    container.innerHTML = "";
    container.className = "panel-single notifications-panel";

    var user = getCurrentUser();
    if (!user || !user.id) {
      var wrap = document.createElement("div");
      wrap.className = "main-view";

      wrap.innerHTML =
        '<div class="main-view-header">' +
        '  <h1 class="main-view-title">' +
        t("title") +
        "</h1>" +
        "</div>" +
        '<div class="panel-body">' +
        '  <p class="text-muted">' +
        t("subtitleNoUser") +
        "</p>" +
        '  <div class="form-actions">' +
        '    <button type="button" class="chip primary" id="notif-go-login">' +
        t("goLogin") +
        "</button>" +
        "  </div>" +
        "</div>";

      container.appendChild(wrap);

      var btnLogin = document.getElementById("notif-go-login");
      if (btnLogin) {
        btnLogin.addEventListener("click", function (ev) {
          ev.preventDefault();
          if (window.Main && typeof window.Main.showView === "function") {
            window.Main.showView("login");
          }
        });
      }

      return;
    }

    var client = getSupabaseClient();
    if (!client) {
      var err = document.createElement("div");
      err.className = "panel-body";
      err.textContent = t("errorLoading");
      container.appendChild(err);
      return;
    }

    var wrap2 = document.createElement("div");
    wrap2.className = "main-view";

    var headerHtml =
      '<div class="main-view-header">' +
      '  <h1 class="main-view-title">' +
      t("title") +
      "</h1>" +
      "</div>";

    wrap2.innerHTML = headerHtml;

    var body = document.createElement("div");
    body.className = "panel-body";
    wrap2.appendChild(body);

    var list = document.createElement("ul");
    list.id = "notifications-list";
    list.className = "notifications-list";
    body.appendChild(list);

    var emptyMsg = document.createElement("p");
    emptyMsg.id = "notifications-empty";
    emptyMsg.className = "notifications-empty";
    emptyMsg.style.display = "none";
    emptyMsg.textContent = t("empty");
    body.appendChild(emptyMsg);

    var actions = document.createElement("div");
    actions.className = "notifications-actions";
    body.appendChild(actions);

    var btnMore = document.createElement("button");
    btnMore.type = "button";
    btnMore.className = "chip";
    btnMore.id = "notifications-load-more";
    btnMore.textContent = t("loadMore");
    actions.appendChild(btnMore);

    container.appendChild(wrap2);

    var state = {
      offset: 0,
      loading: false,
      done: false,
      firstLoad: true,
    };

    async function loadMore() {
      if (state.loading || state.done) return;
      state.loading = true;

      try {
        var from = state.offset;
        var to = state.offset + PAGE_SIZE - 1;

        var query = client
          .from("notifications")
          .select(
            "id, notification_text, type, created_at, is_read",
            { count: "exact" }
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(from, to);

        var res = await query;

        if (res.error) {
          console.warn("[Notifications] error loading list", res.error);
          emptyMsg.style.display = "block";
          emptyMsg.textContent = t("errorLoading");
          btnMore.style.display = "none";
          return;
        }

        var rows = res.data || [];
        if (rows.length === 0 && state.offset === 0) {
          emptyMsg.style.display = "block";
          btnMore.style.display = "none";
          state.done = true;
          return;
        }

        if (rows.length < PAGE_SIZE) {
          state.done = true;
          btnMore.style.display = "none";
        }

        rows.forEach(function (row) {
          var li = document.createElement("li");
          li.className = "notifications-item";
          if (!row.is_read) {
            li.className += " notifications-item--unread";
          }

          var textDiv = document.createElement("div");
          textDiv.className = "notifications-item-text";
          textDiv.textContent = row.notification_text || "";
          li.appendChild(textDiv);

          var timeDiv = document.createElement("div");
          timeDiv.className = "notifications-item-time";
          timeDiv.textContent = formatDateISO(row.created_at);
          li.appendChild(timeDiv);

          list.appendChild(li);
        });

        state.offset += rows.length;

        if (state.firstLoad) {
          state.firstLoad = false;
          markAllAsRead(client, user.id);
        }
      } catch (e) {
        console.warn("[Notifications] excepción cargando lista", e);
        emptyMsg.style.display = "block";
        emptyMsg.textContent = t("errorLoading");
        btnMore.style.display = "none";
        state.done = true;
      } finally {
        state.loading = false;
      }
    }

    btnMore.addEventListener("click", function (ev) {
      ev.preventDefault();
      loadMore();
    });

    loadMore();
  }

  return {
    render: render,
  };
})();
