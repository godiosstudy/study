// main.users.js – módulo de administración de usuarios (listado + detalle simple)
window.MainUsers = (function () {
  var state = {
    page: 1,
    pageSize: 50,
    search: "",
    total: 0,
  };

  function getLang() {
    try {
      if (window.SystemLanguage && typeof window.SystemLanguage.getCurrent === "function") {
        return window.SystemLanguage.getCurrent() || "en";
      }
    } catch (e) {}
    return "en";
  }

  function tr(key, fallback) {
    var lang = getLang();
    if (window.SystemWords && typeof window.SystemWords.t === "function") {
      var mapped = window.SystemWords.t(key, null);
      if (mapped) return mapped;
    }
    try {
      if (window.SystemTranslations && typeof window.SystemTranslations.get === "function") {
        return window.SystemTranslations.get("ui", key, "text", lang, fallback) || fallback;
      }
    } catch (e) {}
    return fallback;
  }

  function isAdminLike() {
    var roles = [];
    try {
      if (window.UserPermissions && Array.isArray(window.UserPermissions.roles)) {
        roles = window.UserPermissions.roles.slice();
      }
      if (window.AuthSession && typeof window.AuthSession.getRoles === "function") {
        roles = roles.concat(window.AuthSession.getRoles());
      }
      var u = window.AuthSession && typeof window.AuthSession.getUser === "function"
        ? window.AuthSession.getUser()
        : null;
      if (u && u.user_metadata && Array.isArray(u.user_metadata.roles)) {
        roles = roles.concat(u.user_metadata.roles);
      }
    } catch (e) {}
    return roles.indexOf("i") !== -1 || roles.indexOf("admin") !== -1 || roles.indexOf(1) !== -1 || roles.indexOf(2) !== -1;
  }

  async function fetchUsers(opts) {
    var page = opts.page || 1;
    var pageSize = opts.pageSize || 50;
    var search = (opts.search || "").trim();

    if (
      !window.BackendSupabase ||
      typeof window.BackendSupabase.client !== "function" ||
      typeof window.BackendSupabase.isConfigured !== "function" ||
      !window.BackendSupabase.isConfigured()
    ) {
      return { data: [], total: 0 };
    }

    var client = window.BackendSupabase.client();
    if (!client) return { data: [], total: 0 };

    var from = (page - 1) * pageSize;
    var to = from + pageSize - 1;

    var query = client
      .from("profiles")
      .select(
        "id, email, first_name, last_name, p_username, credits_balance, p_credits, steps_balance, p_steps, xp_total, light_score, p_roles, p_views, p_likes, p_notes, p_shares",
        { count: "exact" }
      )
      .order("first_name", { ascending: true })
      .range(from, to);

    if (search) {
      query = query.or(
        "email.ilike.%" + search + "%,first_name.ilike.%" + search + "%,last_name.ilike.%" + search + "%,p_username.ilike.%" + search + "%"
      );
    }

    var res = await query;
    if (res.error) {
      console.warn("[MainUsers] fetchUsers error", res.error);
      return { data: [], total: 0 };
    }

    var rows = res.data || [];
    var users = rows.map(function (row) {
      var displayName =
        row.p_username ||
        [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
        row.email ||
        row.id;

      var credits = row.credits_balance != null ? row.credits_balance : row.p_credits || 0;
      var steps = row.steps_balance != null ? row.steps_balance : row.p_steps || 0;

      return {
        id: row.id,
        displayName: displayName,
        email: row.email || "",
        credits: credits || 0,
        steps: steps || 0,
        xp: row.xp_total || 0,
        light: row.light_score || 0,
        roles: row.p_roles || 0,
        views: row.p_views || 0,
        likes: row.p_likes || 0,
        notes: row.p_notes || 0,
        shares: row.p_shares || 0,
        notifications: 0,
        history: 0,
      };
    });

    return { data: users, total: res.count || users.length };
  }

  function renderList(container, users, total) {
    var lang = getLang();
    var headerKeys = [
      { key: "index", label: tr("users.list.header.index", "#") },
      { key: "name", label: tr("users.list.header.name", "Nombre") },
      { key: "credits", label: tr("users.list.header.credits", "Créditos") },
      { key: "steps", label: tr("users.list.header.steps", "Pasos") },
      { key: "xp", label: tr("users.list.header.xp", "XP") },
      { key: "light", label: tr("users.list.header.light", "Luz") },
      { key: "roles", label: tr("users.list.header.roles", "Roles") },
      { key: "views", label: tr("users.list.header.views", "Vistas") },
      { key: "likes", label: tr("users.list.header.likes", "Likes") },
      { key: "notes", label: tr("users.list.header.notes", "Notas") },
      { key: "shares", label: tr("users.list.header.shares", "Compartidos") },
      { key: "notifications", label: tr("users.list.header.notifications", "Notificaciones") },
      { key: "history", label: tr("users.list.header.history", "Historial") },
    ];

    var html = [];
    html.push('<div class="users-table-wrap">');
    html.push('<table class="users-table">');
    html.push("<thead><tr>");
    headerKeys.forEach(function (h) {
      html.push("<th>" + (window.SystemWords ? window.SystemWords.t("users.list.header." + h.key, h.label) : h.label) + "</th>");
    });
    html.push("</tr></thead>");
    html.push("<tbody>");
    users.forEach(function (u, idx) {
      var index = (state.page - 1) * state.pageSize + idx + 1;
      html.push("<tr>");
      html.push("<td>" + index + "</td>");
      html.push(
        '<td><button class="link-like users-row" data-user="' +
          u.id +
          '">' +
          (u.displayName || "") +
          "</button></td>"
      );
      html.push("<td>" + u.credits + "</td>");
      html.push("<td>" + u.steps + "</td>");
      html.push("<td>" + u.xp + "</td>");
      html.push("<td>" + u.light + "</td>");
      html.push("<td>" + u.roles + "</td>");
      html.push("<td>" + u.views + "</td>");
      html.push("<td>" + u.likes + "</td>");
      html.push("<td>" + u.notes + "</td>");
      html.push("<td>" + u.shares + "</td>");
      html.push("<td>" + u.notifications + "</td>");
      html.push("<td>" + u.history + "</td>");
      html.push("</tr>");
    });
    if (!users.length) {
      html.push(
        '<tr><td colspan="' +
          headerKeys.length +
          '">' +
          tr("users.list.empty", "No hay usuarios") +
          "</td></tr>"
      );
    }
    html.push("</tbody></table></div>");

    container.innerHTML = html.join("");

    // click handlers
    var buttons = container.querySelectorAll(".users-row");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var uid = btn.getAttribute("data-user");
        showDetail(uid, Object.assign({}, state));
      });
    });
  }

  function renderPagination(container, total) {
    var totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    var prevLabel = tr("users.pagination.prev", "Anterior");
    var nextLabel = tr("users.pagination.next", "Siguiente");

    var html = [];
    html.push('<div class="users-pagination">');
    html.push(
      '<button class="chip" data-nav="prev" ' +
        (state.page <= 1 ? "disabled" : "") +
        ">" +
        prevLabel +
        "</button>"
    );
    html.push(
      '<span class="users-page-indicator">' +
        tr("users.pagination.page", "Página") +
        " " +
        state.page +
        " / " +
        totalPages +
        "</span>"
    );
    html.push(
      '<button class="chip" data-nav="next" ' +
        (state.page >= totalPages ? "disabled" : "") +
        ">" +
        nextLabel +
        "</button>"
    );
    html.push("</div>");

    container.innerHTML = html.join("");

    var prevBtn = container.querySelector('[data-nav="prev"]');
    var nextBtn = container.querySelector('[data-nav="next"]');
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (state.page > 1) {
          state.page -= 1;
          showList(state);
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        var totalPagesLocal = Math.max(1, Math.ceil(state.total / state.pageSize));
        if (state.page < totalPagesLocal) {
          state.page += 1;
          showList(state);
        }
      });
    }
  }

  async function showList(prevState) {
    if (!isAdminLike()) {
      try {
        if (window.HeaderMessages && typeof window.HeaderMessages.show === "function") {
          window.HeaderMessages.show(tr("users.perms.denied", "No tienes permisos para Usuarios"), {
            type: "error",
            duration: 7000,
          });
        }
      } catch (e) {}
      return;
    }

    if (prevState) {
      state = Object.assign({}, state, prevState);
    }

    var container = document.getElementById("app-main");
    if (!container) return;
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "panel panel-single register-panel users-view";
    var title = tr("users.title", "Usuarios");
    var searchPh = tr("users.search.placeholder", "Buscar usuarios");

    wrap.innerHTML = [
      '<div class="main-view-header">',
      '  <h1 class="main-view-title">' + title + "</h1>",
      "</div>",
      '<div class="users-search">',
      '  <input type="search" id="users-search" placeholder="' + searchPh + '" />',
      "</div>",
      '<div id="users-list"></div>',
      '<div id="users-pagination"></div>',
    ].join("\n");

    container.appendChild(wrap);

    var searchInput = wrap.querySelector("#users-search");
    if (searchInput) {
      searchInput.value = state.search || "";
      searchInput.addEventListener("input", function () {
        state.search = searchInput.value || "";
        state.page = 1;
        showList(state);
      });
    }

    var listEl = wrap.querySelector("#users-list");
    var pagEl = wrap.querySelector("#users-pagination");

    var res = await fetchUsers({
      page: state.page,
      pageSize: state.pageSize,
      search: state.search,
    });
    state.total = res.total || 0;

    renderList(listEl, res.data || [], state.total);
    renderPagination(pagEl, state.total);
  }

  async function showDetail(userId, prevState) {
    // Placeholder simple; puede ampliarse a vista detallada
    if (!isAdminLike()) {
      try {
        if (window.HeaderMessages && typeof window.HeaderMessages.show === "function") {
          window.HeaderMessages.show(tr("users.perms.denied", "No tienes permisos para Usuarios"), {
            type: "error",
            duration: 7000,
          });
        }
      } catch (e) {}
      return;
    }

    var lang = getLang();
    var container = document.getElementById("app-main");
    if (!container) return;
    container.innerHTML = "";

    var backLabel = tr("users.detail.back", "Volver");
    var title = tr("users.detail.title", "Usuario");

    var wrap = document.createElement("div");
    wrap.className = "panel panel-single register-panel users-view";
    wrap.innerHTML = [
      '<div class="main-view-header">',
      '  <h1 class="main-view-title">' + title + "</h1>",
      "</div>",
      '<div class="users-detail">',
      '  <p>' + tr("users.detail.placeholder", "Detalle de usuario en construcción") + "</p>",
      '  <button class="chip" id="users-back">' + backLabel + "</button>",
      "</div>",
    ].join("\n");

    container.appendChild(wrap);

    var backBtn = wrap.querySelector("#users-back");
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        showList(prevState || state);
      });
    }
  }

  function render() {
    showList({ page: 1, search: "" });
  }

  return {
    render: render,
    showList: showList,
    showDetail: showDetail,
  };
})();
