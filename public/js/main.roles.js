// main.roles.js - módulo de administración de roles
window.MainRoles = (function () {
  var state = {
    roles: [],
    translations: {},
    search: "",
    editing: null,
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

  function getClient() {
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
      console.warn("[Roles] Supabase client error", e);
    }
    return null;
  }

  function isAdminLikeUser() {
    var roles = [];
    try {
      if (window.AuthSession && typeof window.AuthSession.getRoles === "function") {
        roles = roles.concat(window.AuthSession.getRoles() || []);
      }
      if (window.UserPermissions && Array.isArray(window.UserPermissions.roles)) {
        roles = roles.concat(window.UserPermissions.roles);
      }
      var u = window.AuthSession && typeof window.AuthSession.getUser === "function"
        ? window.AuthSession.getUser()
        : null;
      if (u && u.user_metadata && Array.isArray(u.user_metadata.roles)) {
        roles = roles.concat(u.user_metadata.roles);
      }
    } catch (e) {}

    return roles.some(function (r) {
      if (r == null) return false;
      if (typeof r === "number") {
        return r === 1 || r === 2;
      }
      if (typeof r === "string") {
        var code = r.toLowerCase();
        return code === "i" || code === "admin" || code === "superadmin";
      }
      if (typeof r === "object") {
        var id = r.role_id != null ? r.role_id : r.id;
        var codeObj = (r.code || "").toLowerCase();
        if (id === 1 || id === 2) return true;
        if (codeObj === "i" || codeObj === "admin" || codeObj === "superadmin") return true;
      }
      return false;
    });
  }

  function showMessage(type, text) {
    try {
      if (window.HeaderMessages && typeof window.HeaderMessages.show === "function") {
        window.HeaderMessages.show(text, { type: type || "info", duration: 7000 });
      } else {
        console.log("[Roles][" + type + "]", text);
      }
    } catch (e) {}
  }

  async function loadTranslationsForLang(lang) {
    state.translations[lang] = {};
    var client = getClient();
    if (!client) return;
    try {
      var res = await client
        .from("system_translations")
        .select("entity_id, field, lang, value")
        .eq("entity_type", "role")
        .eq("lang", lang);
      if (res && res.error) {
        console.warn("[Roles] translations error", res.error);
        return;
      }
      (res.data || []).forEach(function (row) {
        var id = String(row.entity_id);
        state.translations[lang][id] = state.translations[lang][id] || {};
        state.translations[lang][id][row.field] = row.value;
      });
    } catch (e) {
      console.warn("[Roles] translations exception", e);
    }
  }

  async function loadTranslationsForRole(roleId) {
    var client = getClient();
    if (!client || !roleId) return {};
    try {
      var res = await client
        .from("system_translations")
        .select("entity_id, field, lang, value")
        .eq("entity_type", "role")
        .eq("entity_id", String(roleId))
        .in("lang", ["en", "es"]);
      if (res && res.error) {
        console.warn("[Roles] translations role error", res.error);
        return {};
      }
      var map = {};
      (res.data || []).forEach(function (row) {
        var lang = row.lang;
        map[lang] = map[lang] || {};
        map[lang][row.field] = row.value;
      });
      return map;
    } catch (e) {
      console.warn("[Roles] translations role exception", e);
      return {};
    }
  }

  function getDisplayName(role, lang) {
    lang = lang || getLang();
    var tmap = (state.translations && state.translations[lang]) || {};
    var t = (tmap && tmap[String(role.id)]) || {};
    return t.name || role.name || role.code || ("#" + role.id);
  }

  async function loadRoles() {
    var client = getClient();
    if (!client) return [];
    var res = await client
      .from("roles")
      .select("id, code, name, description, parent_role_id, is_active, is_default_for_new_users")
      .order("id", { ascending: true });
    if (res && res.error) {
      console.warn("[Roles] loadRoles error", res.error);
      return [];
    }
    state.roles = res.data || [];
    return state.roles;
  }

  function getFilteredRoles() {
    var term = (state.search || "").trim().toLowerCase();
    if (!term) return state.roles;
    var lang = getLang();
    return state.roles.filter(function (r) {
      var name = (getDisplayName(r, lang) || "").toLowerCase();
      var code = (r.code || "").toLowerCase();
      return name.indexOf(term) !== -1 || code.indexOf(term) !== -1;
    });
  }

  function buildParentOptions(currentId) {
    var opts = ['<option value="">--</option>'];
    state.roles.forEach(function (r) {
      if (r.id === currentId) return;
      opts.push(
        '<option value="' +
          r.id +
          '">' +
          (r.code || "") +
          " - " +
          (getDisplayName(r) || "") +
          "</option>"
      );
    });
    return opts.join("");
  }

  function isInvalidParent(roleId, parentId) {
    if (!parentId || !roleId) return false;
    if (parentId === roleId) return true;
    var map = {};
    state.roles.forEach(function (r) {
      map[r.id] = r.parent_role_id;
    });
    var current = parentId;
    while (current) {
      if (current === roleId) return true;
      current = map[current];
    }
    return false;
  }

  async function toggleActive(role) {
    if (!role || !role.id) return;
    if (role.id === 1) {
      showMessage("warning", tr("roles.error.cannotDeactivateMain", "No puedes desactivar el rol principal"));
      return;
    }
    var client = getClient();
    if (!client) return;
    var next = !role.is_active;
    var res = await client.from("roles").update({ is_active: next }).eq("id", role.id);
    if (res && res.error) {
      showMessage("error", tr("roles.error.toggle", "No se pudo actualizar el estado del rol"));
      console.error("[Roles] toggleActive error", res.error);
      return;
    }
    role.is_active = next;
    renderTable();
  }

  async function upsertTranslation(roleId, field, lang, value) {
    var client = getClient();
    if (!client) return;
    if (!value) {
      try {
        await client
          .from("system_translations")
          .delete()
          .eq("entity_type", "role")
          .eq("entity_id", String(roleId))
          .eq("field", field)
          .eq("lang", lang);
      } catch (e) {
        console.warn("[Roles] delete translation error", e);
      }
      return;
    }
    var payload = {
      entity_type: "role",
      entity_id: String(roleId),
      field: field,
      lang: lang,
      value: value,
    };
    await client.from("system_translations").upsert(payload);
  }

  // 💾 Guardar rol (crear o actualizar)
  async function saveRole(formEl, role) {
    if (!formEl) return;
    var client = getClient();
    if (!client) return;

    var codeInput = formEl.querySelector('[name="code"]');
    var nameEnInput = formEl.querySelector('[name="name_en"]');
    var descEnInput = formEl.querySelector('[name="desc_en"]');
    var nameEsInput = formEl.querySelector('[name="name_es"]');
    var descEsInput = formEl.querySelector('[name="desc_es"]');
    var parentInput = formEl.querySelector('[name="parent"]');
    var activeInput = formEl.querySelector('[name="active"]');
    var defaultInput = formEl.querySelector('[name="default"]');

    var code = (codeInput && codeInput.value ? codeInput.value.trim().toLowerCase() : "");
    var nameEn = (nameEnInput && nameEnInput.value ? nameEnInput.value.trim() : "");
    var descEn = (descEnInput && descEnInput.value ? descEnInput.value.trim() : "");
    var nameEs = (nameEsInput && nameEsInput.value ? nameEsInput.value.trim() : "");
    var descEs = (descEsInput && descEsInput.value ? descEsInput.value.trim() : "");
    var parentId = parentInput && parentInput.value ? Number(parentInput.value) : null;
    var isActive = activeInput ? !!activeInput.checked : true;
    var isDefault = defaultInput ? !!defaultInput.checked : false;

    if (!code || /\s/.test(code)) {
      showMessage("error", tr("roles.error.codeRequired", "El código es obligatorio y no debe tener espacios"));
      return;
    }
    if (!nameEn) {
      showMessage("error", tr("roles.error.nameRequired", "El nombre es obligatorio"));
      return;
    }

    if (role && (role.id === 1 || role.id === 2)) {
      // proteger códigos base
      code = role.code;
    }
    if (role && role.id === 1) {
      parentId = null;
      isActive = true;
    }
    if (role && isInvalidParent(role.id, parentId)) {
      showMessage("error", tr("roles.error.parentCycle", "El rol superior genera un ciclo"));
      return;
    }

    var payload = {
      code: code,
      name: nameEn,
      description: descEn,
      parent_role_id: parentId,
      is_active: isActive,
      is_default_for_new_users: isDefault,
    };

    var user =
      window.AuthSession && typeof window.AuthSession.getUser === "function"
        ? window.AuthSession.getUser()
        : null;
    if (user && user.id && !role) {
      payload.created_by = user.id;
    }

    console.log("[Roles] guardando payload", payload, "role:", role);

    let res;
    try {
      if (role && role.id) {
        // update existente
        res = await client
          .from("roles")
          .update(payload)
          .eq("id", role.id)
          .select("*")
          .single();
      } else {
        // insert nuevo
        res = await client
          .from("roles")
          .insert([payload])
          .select("*")
          .single();
      }
    } catch (e) {
      console.error("[Roles] excepción en saveRole", e);
      showMessage("error", tr("roles.error.save", "No se pudo guardar el rol"));
      return;
    }

    if (res && res.error) {
      console.error("[Roles] error al guardar rol", res.error);
      showMessage(
        "error",
        tr("roles.error.save", "No se pudo guardar el rol") +
          (res.error.message ? " (" + res.error.message + ")" : "")
      );
      return;
    }

    var saved = (res && res.data) || role || {};
    var roleId = saved.id || (role && role.id);

    if (roleId && isDefault) {
      // asegurarse de que sólo uno queda como default
      await client
        .from("roles")
        .update({ is_default_for_new_users: false })
        .neq("id", roleId);
      await client
        .from("roles")
        .update({ is_default_for_new_users: true })
        .eq("id", roleId);
    }

    if (roleId) {
      await upsertTranslation(roleId, "name", "es", nameEs);
      await upsertTranslation(roleId, "description", "es", descEs);
      await upsertTranslation(roleId, "name", "en", nameEn);
      await upsertTranslation(roleId, "description", "en", descEn);
    }

    showMessage(
      "success",
      tr(
        role ? "roles.msg.updated" : "roles.msg.created",
        role ? "Rol actualizado" : "Rol creado correctamente"
      )
    );
    await refresh();
  }

  function renderTable() {
    var list = document.getElementById("roles-table-body");
    if (!list) return;
    var roles = getFilteredRoles();
    var lang = getLang();

    var rows = [];
    roles.forEach(function (r, idx) {
      rows.push("<tr>");
      rows.push("<td>" + (idx + 1) + "</td>");
      rows.push("<td>" + r.id + "</td>");
      rows.push("<td>" + (r.code || "") + "</td>");
      rows.push("<td>" + (getDisplayName(r, lang) || "") + "</td>");
      var parent = state.roles.find(function (p) {
        return p.id === r.parent_role_id;
      });
      rows.push("<td>" + (parent ? getDisplayName(parent, lang) : "--") + "</td>");
      rows.push(
        '<td><button class="chip small" data-action="toggle" data-id="' +
          r.id +
          '">' +
          (r.is_active
            ? tr("roles.list.active", "Activo")
            : tr("roles.list.inactive", "Inactivo")) +
          "</button></td>"
      );
      rows.push(
        "<td>" +
          (r.is_default_for_new_users
            ? tr("roles.list.defaultYes", "Sí")
            : tr("roles.list.defaultNo", "No")) +
          "</td>"
      );
      rows.push(
        '<td><button class="chip small" data-action="edit" data-id="' +
          r.id +
          '">' +
          tr("roles.list.edit", "Editar") +
          "</button></td>"
      );
      rows.push("</tr>");
    });
    if (!rows.length) {
      rows.push(
        '<tr><td colspan="8">' +
          tr("roles.list.empty", "No hay roles") +
          "</td></tr>"
      );
    }
    list.innerHTML = rows.join("");

    list.querySelectorAll('[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        var role = state.roles.find(function (r) {
          return r.id === id;
        });
        openForm(role || null);
      });
    });
    list.querySelectorAll('[data-action="toggle"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        var role = state.roles.find(function (r) {
          return r.id === id;
        });
        toggleActive(role);
      });
    });
  }

  function renderForm(role, translations) {
    var lang = getLang();
    var container = document.getElementById("roles-form");
    if (!container) return;

    var title = role
      ? tr("roles.form.title.edit", "Editar rol")
      : tr("roles.form.title.new", "Nuevo rol");
    var nameEn =
      (translations && translations.en && translations.en.name) ||
      (role && role.name) ||
      "";
    var descEn =
      (translations && translations.en && translations.en.description) ||
      (role && role.description) ||
      "";
    var nameEs = (translations && translations.es && translations.es.name) || "";
    var descEs =
      (translations && translations.es && translations.es.description) || "";
    var disableCode = role && role.id ? "disabled" : "";

    container.innerHTML = [
      '<div class="roles-form-panel">',
      "  <h2>" + title + "</h2>",
      '  <form id="roles-edit-form">',
      '    <div class="form-grid">',
      '      <label>Código<input name="code" type="text" ' +
        disableCode +
        ' value="' +
        (role && role.code ? role.code : "") +
        '" /></label>',
      "      <label>" +
        tr("roles.form.name.en", "Nombre (en)") +
        '<input name="name_en" type="text" value="' +
        nameEn +
        '" /></label>',
      "      <label>" +
        tr("roles.form.desc.en", "Descripción (en)") +
        '<textarea name="desc_en">' +
        descEn +
        "</textarea></label>",
      "      <label>" +
        tr("roles.form.name.es", "Nombre (es)") +
        '<input name="name_es" type="text" value="' +
        nameEs +
        '" /></label>',
      "      <label>" +
        tr("roles.form.desc.es", "Descripción (es)") +
        '<textarea name="desc_es">' +
        descEs +
        "</textarea></label>",
      "      <label>" +
        tr("roles.form.parent", "Superior") +
        '<select name="parent">' +
        buildParentOptions(role && role.id) +
        "</select></label>",
      "      <label><input type=\"checkbox\" name=\"active\" " +
        ((role ? role.is_active : true) ? "checked" : "") +
        " /> " +
        tr("roles.form.active", "Activo") +
        "</label>",
      "      <label><input type=\"checkbox\" name=\"default\" " +
        (role && role.is_default_for_new_users ? "checked" : "") +
        " /> " +
        tr("roles.form.default", "Default nuevos usuarios") +
        "</label>",
      "    </div>",
      '    <div class="roles-form-actions">',
      '      <button type="submit" class="chip primary">' +
        tr("roles.form.save", "Guardar") +
        "</button>",
      '      <button type="button" class="chip" id="roles-cancel">' +
        tr("roles.form.cancel", "Cancelar") +
        "</button>",
      "    </div>",
      "  </form>",
      "</div>",
    ].join("\n");

    var parentSel = container.querySelector('select[name="parent"]');
    if (parentSel && role && role.parent_role_id) {
      parentSel.value = String(role.parent_role_id);
    }

    var form = container.querySelector("#roles-edit-form");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        saveRole(form, role || null);
      });
    }
    var cancelBtn = container.querySelector("#roles-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        container.innerHTML = "";
      });
    }
  }

  async function openForm(role) {
    var translations = role ? await loadTranslationsForRole(role.id) : {};
    renderForm(role, translations);
  }

  function renderLayout() {
    var container = document.getElementById("app-main");
    if (!container) return;
    container.innerHTML = [
      '<div class="panel panel-single roles-view">',
      '  <div class="main-view-header">',
      '    <h1 class="main-view-title">' +
        tr("roles.title", "Roles") +
        "</h1>",
      "  </div>",
      '  <div class="roles-bar">',
      '    <input type="search" id="roles-search" placeholder="' +
        tr("roles.search.placeholder", "Buscar roles") +
        '" />',
      '    <button class="chip primary" id="roles-new">' +
        tr("roles.new", "Nuevo rol") +
        "</button>",
      "  </div>",
      '  <div class="roles-table-wrap">',
      '    <table class="roles-table">',
      "      <thead>",
      "        <tr>",
      "          <th>#</th>",
      "          <th>ID</th>",
      "          <th>Código</th>",
      "          <th>" + tr("roles.list.name", "Nombre") + "</th>",
      "          <th>" + tr("roles.list.parent", "Superior") + "</th>",
      "          <th>" + tr("roles.list.activeCol", "Activo") + "</th>",
      "          <th>" + tr("roles.list.defaultCol", "Default") + "</th>",
      "          <th>" + tr("roles.list.actions", "Acciones") + "</th>",
      "        </tr>",
      "      </thead>",
      '      <tbody id="roles-table-body"></tbody>',
      "    </table>",
      "  </div>",
      '  <div id="roles-form"></div>',
      "</div>",
    ].join("\n");

    var searchInput = container.querySelector("#roles-search");
    if (searchInput) {
      searchInput.value = state.search || "";
      searchInput.addEventListener("input", function () {
        state.search = searchInput.value || "";
        renderTable();
      });
    }
    var newBtn = container.querySelector("#roles-new");
    if (newBtn) {
      newBtn.addEventListener("click", function () {
        openForm(null);
      });
    }
  }

  async function refresh() {
    if (!isAdminLikeUser()) {
      showMessage("error", tr("roles.perms.denied", "No tienes permisos para Roles"));
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("navigator");
      }
      return;
    }
    await loadRoles();
    await loadTranslationsForLang(getLang());
    renderTable();
    var formWrap = document.getElementById("roles-form");
    if (formWrap) formWrap.innerHTML = "";
  }

  function render() {
    if (!isAdminLikeUser()) {
      showMessage("error", tr("roles.perms.denied", "No tienes permisos para Roles"));
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("navigator");
      }
      return;
    }
    renderLayout();
    refresh();
  }

  function show() {
    render();
  }

  function hide() {
    var container = document.getElementById("app-main");
    if (container) container.innerHTML = "";
  }

  function init() {
    // placeholder si se necesita lógica futura
  }

  return {
    init: init,
    render: render,
    show: show,
    hide: hide,
  };
})();
