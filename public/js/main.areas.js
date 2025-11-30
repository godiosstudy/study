// main.areas.js - módulo de administración de áreas
window.MainAreas = (function () {
  var state = {
    areas: [],
    sources: [],
    roles: [],
    translations: {},
    search: "",
    page: 1,
    pageSize: 50,
  };

  function getLang() {
    try {
      if (
        window.SystemLanguage &&
        typeof window.SystemLanguage.getCurrent === "function"
      ) {
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
      if (
        window.SystemTranslations &&
        typeof window.SystemTranslations.get === "function"
      ) {
        return (
          window.SystemTranslations.get("ui", key, "text", lang, fallback) ||
          fallback
        );
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
      console.warn("[Areas] Supabase client error", e);
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
      var u =
        window.AuthSession && typeof window.AuthSession.getUser === "function"
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
        if (codeObj === "i" || codeObj === "admin" || codeObj === "superadmin")
          return true;
      }
      return false;
    });
  }

  function showMessage(type, text) {
    try {
      if (window.HeaderMessages && typeof window.HeaderMessages.show === "function") {
        window.HeaderMessages.show(text, {
          type: type || "info",
          duration: 7000,
        });
      } else {
        console.log("[Areas][" + type + "]", text);
      }
    } catch (e) {}
  }

  // ---- carga de catálogos ----

  async function loadSources() {
    var client = getClient();
    if (!client) return [];
    var res = await client
      .from("area_sources")
      .select("id, code, name, description, is_active")
      .order("id", { ascending: true });
    if (res && res.error) {
      console.warn("[Areas] loadSources error", res.error);
      return [];
    }
    state.sources = res.data || [];
    return state.sources;
  }

  async function loadRolesCatalog() {
    var client = getClient();
    if (!client) return [];
    var res = await client
      .from("roles")
      .select("id, code, name, is_active")
      .order("id", { ascending: true });
    if (res && res.error) {
      console.warn("[Areas] loadRolesCatalog error", res.error);
      return [];
    }
    state.roles = res.data || [];
    return state.roles;
  }

  async function loadAreas() {
    var client = getClient();
    if (!client) return [];
    var res = await client
      .from("areas")
      .select(
        "id, code, name, description, source_id, is_active, is_public, owner_role_id"
      )
      .order("name", { ascending: true });
    if (res && res.error) {
      console.warn("[Areas] loadAreas error", res.error);
      return [];
    }
    state.areas = res.data || [];
    return state.areas;
  }

  // ---- traducciones ----

  async function loadTranslationsForLang(lang) {
    state.translations[lang] = {};
    var client = getClient();
    if (!client) return;
    try {
      var res = await client
        .from("system_translations")
        .select("entity_id, field, lang, value")
        .eq("entity_type", "area")
        .eq("lang", lang);
      if (res && res.error) {
        console.warn("[Areas] translations error", res.error);
        return;
      }
      (res.data || []).forEach(function (row) {
        var id = String(row.entity_id);
        state.translations[lang][id] = state.translations[lang][id] || {};
        state.translations[lang][id][row.field] = row.value;
      });
    } catch (e) {
      console.warn("[Areas] translations exception", e);
    }
  }

  async function loadTranslationsForArea(areaId) {
    var client = getClient();
    if (!client || !areaId) return {};
    try {
      var res = await client
        .from("system_translations")
        .select("field, lang, value")
        .eq("entity_type", "area")
        .eq("entity_id", String(areaId))
        .in("lang", ["en", "es"]);
      if (res && res.error) {
        console.warn("[Areas] translations area error", res.error);
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
      console.warn("[Areas] translations area exception", e);
      return {};
    }
  }

  function getDisplayName(area, lang) {
    lang = lang || getLang();
    var tmap = (state.translations && state.translations[lang]) || {};
    var t = (tmap && tmap[String(area.id)]) || {};
    return t.name || area.name || area.code || "#" + area.id;
  }

  function getSourceName(id) {
    var s = state.sources.find(function (x) {
      return x.id === id;
    });
    if (!s) return "--";
    return s.name || s.code || String(s.id);
  }

  function getRoleName(id) {
    var r = state.roles.find(function (x) {
      return x.id === id;
    });
    if (!r) return "--";
    return r.name || r.code || String(r.id);
  }

  // ---- filtrado y paginación ----

  function getFilteredAreas() {
    var term = (state.search || "").trim().toLowerCase();
    if (!term) return state.areas;
    var lang = getLang();
    return state.areas.filter(function (a) {
      var name = (getDisplayName(a, lang) || "").toLowerCase();
      var code = (a.code || "").toLowerCase();
      return name.indexOf(term) !== -1 || code.indexOf(term) !== -1;
    });
  }

  function getPagedAreas() {
    var list = getFilteredAreas();
    var total = list.length;
    var pageSize = state.pageSize;
    var page = Math.max(1, state.page);
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;
    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    return {
      page: page,
      total: total,
      totalPages: totalPages,
      items: list.slice(start, end),
    };
  }

  // ---- permisos ----

  function collectPermsFromForm(formEl) {
    var perms = {};
    state.roles.forEach(function (role) {
      var id = role.id;
      var view = formEl.querySelector('[name="perm_view_' + id + '"]');
      var participate = formEl.querySelector(
        '[name="perm_participate_' + id + '"]'
      );
      var content = formEl.querySelector('[name="perm_content_' + id + '"]');
      var members = formEl.querySelector('[name="perm_members_' + id + '"]');
      var area = formEl.querySelector('[name="perm_area_' + id + '"]');
      perms[id] = {
        role_id: id,
        can_view: view ? !!view.checked : false,
        can_participate: participate ? !!participate.checked : false,
        can_manage_content: content ? !!content.checked : false,
        can_manage_members: members ? !!members.checked : false,
        can_manage_area: area ? !!area.checked : false,
      };
    });
    return perms;
  }

  async function savePermissions(areaId, perms) {
    var client = getClient();
    if (!client || !areaId) return;
    try {
      for (var rid in perms) {
        if (!Object.prototype.hasOwnProperty.call(perms, rid)) continue;
        var p = perms[rid];
        var payload = {
          area_id: areaId,
          role_id: p.role_id,
          can_view: !!p.can_view,
          can_participate: !!p.can_participate,
          can_manage_content: !!p.can_manage_content,
          can_manage_members: !!p.can_manage_members,
          can_manage_area: !!p.can_manage_area,
        };
        await client.from("area_role_permissions").upsert(payload);
      }
    } catch (e) {
      console.warn("[Areas] savePermissions error", e);
      showMessage(
        "warning",
        tr(
          "areas.perms.saveError",
          "No se pudieron guardar algunos permisos"
        )
      );
    }
  }

  async function loadAreaPermissions(areaId) {
    var client = getClient();
    if (!client || !areaId) return {};
    var res = await client
      .from("area_role_permissions")
      .select(
        "role_id, can_view, can_participate, can_manage_content, can_manage_members, can_manage_area"
      )
      .eq("area_id", areaId);
    if (res && res.error) {
      console.warn("[Areas] perms load error", res.error);
      return {};
    }
    var map = {};
    (res.data || []).forEach(function (row) {
      map[row.role_id] = {
        role_id: row.role_id,
        can_view: row.can_view,
        can_participate: row.can_participate,
        can_manage_content: row.can_manage_content,
        can_manage_members: row.can_manage_members,
        can_manage_area: row.can_manage_area,
      };
    });
    return map;
  }

  function buildDefaultPermsForNewArea() {
    var map = {};
    state.roles.forEach(function (r) {
      var base = {
        role_id: r.id,
        can_view: true,
        can_participate: false,
        can_manage_content: false,
        can_manage_members: false,
        can_manage_area: false,
      };
      var code = (r.code || "").toLowerCase();
      if (
        r.id === 1 ||
        r.id === 2 ||
        code === "i" ||
        code === "admin" ||
        code === "superadmin"
      ) {
        base.can_participate = true;
        base.can_manage_content = true;
        base.can_manage_members = true;
        base.can_manage_area = true;
      }
      if (code === "participant" || r.id === 3) {
        base.can_participate = true;
      }
      map[r.id] = base;
    });
    return map;
  }

  // ---- guardar área ----

  async function upsertTranslation(areaId, field, lang, value) {
    var client = getClient();
    if (!client) return;

    // si value está vacío, borramos la traducción (si existe)
    if (!value) {
      try {
        await client
          .from("system_translations")
          .delete()
          .eq("entity_type", "area")
          .eq("entity_id", String(areaId))
          .eq("field", field)
          .eq("lang", lang);
      } catch (e) {
        console.warn("[Areas] delete translation error", e);
      }
      return;
    }

    var payload = {
      entity_type: "area",
      entity_id: String(areaId),
      field: field,
      lang: lang,
      value: value,
    };

    try {
      // importante: indicar la constraint única para evitar 409
      var res = await client
        .from("system_translations")
        .upsert(payload, {
          onConflict: "entity_type,entity_id,field,lang",
          ignoreDuplicates: false,
        });

      if (res && res.error) {
        console.warn("[Areas] upsert translation error", res.error);
      }
    } catch (e) {
      console.warn("[Areas] upsert translation exception", e);
    }
  }

  async function saveArea(formEl, area, permsExisting) {
    if (!formEl) return;
    var client = getClient();
    if (!client) return;

    var codeInput = formEl.querySelector('[name="code"]');
    var nameEnInput = formEl.querySelector('[name="name_en"]');
    var descEnInput = formEl.querySelector('[name="desc_en"]');
    var nameEsInput = formEl.querySelector('[name="name_es"]');
    var descEsInput = formEl.querySelector('[name="desc_es"]');
    var sourceSel = formEl.querySelector('[name="source_id"]');
    var ownerSel = formEl.querySelector('[name="owner_role_id"]');
    var activeInput = formEl.querySelector('[name="is_active"]');
    var publicInput = formEl.querySelector('[name="is_public"]');

    var code =
      codeInput && codeInput.value ? codeInput.value.trim().toLowerCase() : "";
    var nameEn = nameEnInput && nameEnInput.value
      ? nameEnInput.value.trim()
      : "";
    var descEn = descEnInput && descEnInput.value
      ? descEnInput.value.trim()
      : "";
    var nameEs = nameEsInput && nameEsInput.value
      ? nameEsInput.value.trim()
      : "";
    var descEs = descEsInput && descEsInput.value
      ? descEsInput.value.trim()
      : "";
    var sourceId = sourceSel && sourceSel.value ? Number(sourceSel.value) : null;
    var ownerRoleId =
      ownerSel && ownerSel.value ? Number(ownerSel.value) : null;
    var isActive = activeInput ? !!activeInput.checked : true;
    var isPublic = publicInput ? !!publicInput.checked : false;

    if (!code || /\s/.test(code)) {
      showMessage(
        "error",
        tr("areas.error.codeRequired", "El código es obligatorio y sin espacios")
      );
      return;
    }
    if (!nameEn) {
      showMessage(
        "error",
        tr("areas.error.nameRequired", "El nombre es obligatorio")
      );
      return;
    }
    if (!sourceId) {
      showMessage(
        "error",
        tr("areas.error.sourceRequired", "Selecciona una fuente")
      );
      return;
    }

    var payload = {
      code: code,
      name: nameEn,
      description: descEn,
      source_id: sourceId,
      owner_role_id: ownerRoleId || null,
      is_active: isActive,
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    };

    var user =
      window.AuthSession &&
      typeof window.AuthSession.getUser === "function"
        ? window.AuthSession.getUser()
        : null;
    if (!area) {
      payload.created_at = new Date().toISOString();
      if (user && user.id) payload.created_by = user.id;
    } else if (user && user.id) {
      payload.updated_by = user.id;
    }

    var res;
    if (area && area.id) {
      var qUpdate = client.from("areas").update(payload).eq("id", area.id).select();
      if (qUpdate && typeof qUpdate.single === "function") {
        res = await qUpdate.single();
      } else {
        res = await qUpdate;
      }
    } else {
      var qInsert = client.from("areas").insert(payload).select();
      if (qInsert && typeof qInsert.single === "function") {
        res = await qInsert.single();
      } else {
        res = await qInsert;
      }
    }

    if (res && res.error) {
      console.error("[Areas] error al guardar área", res.error);
      showMessage(
        "error",
        tr("areas.error.save", "No se pudo guardar el área") +
          " (" +
          res.error.message +
          ")"
      );
      return;
    }

    var saved = (res && res.data) || area || {};
    var areaId = saved.id || (area && area.id);

    if (areaId) {
      await upsertTranslation(areaId, "name", "en", nameEn);
      await upsertTranslation(areaId, "description", "en", descEn);
      await upsertTranslation(areaId, "name", "es", nameEs);
      await upsertTranslation(areaId, "description", "es", descEs);

      var perms = collectPermsFromForm(formEl);
      await savePermissions(areaId, perms);
    }

    showMessage(
      "success",
      tr(
        area ? "areas.msg.updated" : "areas.msg.created",
        area ? "Área actualizada" : "Área creada correctamente"
      )
    );
    await refresh();
  }

  // ---- render de permisos ----

  function renderPermsTable(container, perms) {
    if (!container) return;
    var rows = [];
    rows.push('<table class="areas-perms-table"><thead><tr>');
    rows.push("<th>" + tr("areas.perms.role", "Rol") + "</th>");
    rows.push("<th>" + tr("areas.perms.view", "Ver") + "</th>");
    rows.push("<th>" + tr("areas.perms.participate", "Participar") + "</th>");
    rows.push("<th>" + tr("areas.perms.content", "Contenido") + "</th>");
    rows.push("<th>" + tr("areas.perms.members", "Miembros") + "</th>");
    rows.push("<th>" + tr("areas.perms.area", "Área") + "</th>");
    rows.push("</tr></thead><tbody>");
    state.roles
      .filter(function (r) {
        return r.is_active !== false;
      })
      .forEach(function (r) {
        var p =
          perms[r.id] || {
            can_view: false,
            can_participate: false,
            can_manage_content: false,
            can_manage_members: false,
            can_manage_area: false,
          };
        rows.push("<tr>");
        rows.push("<td>" + (r.name || r.code || r.id) + "</td>");
        rows.push(
          '<td><input type="checkbox" name="perm_view_' +
            r.id +
            '" ' +
            (p.can_view ? "checked" : "") +
            " /></td>"
        );
        rows.push(
          '<td><input type="checkbox" name="perm_participate_' +
            r.id +
            '" ' +
            (p.can_participate ? "checked" : "") +
            " /></td>"
        );
        rows.push(
          '<td><input type="checkbox" name="perm_content_' +
            r.id +
            '" ' +
            (p.can_manage_content ? "checked" : "") +
            " /></td>"
        );
        rows.push(
          '<td><input type="checkbox" name="perm_members_' +
            r.id +
            '" ' +
            (p.can_manage_members ? "checked" : "") +
            " /></td>"
        );
        rows.push(
          '<td><input type="checkbox" name="perm_area_' +
            r.id +
            '" ' +
            (p.can_manage_area ? "checked" : "") +
            " /></td>"
        );
        rows.push("</tr>");
      });
    rows.push("</tbody></table>");
    container.innerHTML = rows.join("");
  }

  // ---- formulario ----

  async function renderForm(area, translations) {
    var container = document.getElementById("areas-form");
    if (!container) return;
    var title = area
      ? tr("areas.form.title.edit", "Editar área")
      : tr("areas.form.title.new", "Nueva área");
    var nameEn =
      (translations && translations.en && translations.en.name) ||
      (area && area.name) ||
      "";
    var descEn =
      (translations && translations.en && translations.en.description) ||
      (area && area.description) ||
      "";
    var nameEs =
      (translations && translations.es && translations.es.name) || "";
    var descEs =
      (translations && translations.es && translations.es.description) || "";
    var disableCode = area && area.id ? "disabled" : "";

    var sourceOptions = state.sources
      .map(function (s) {
        return (
          '<option value="' +
          s.id +
          '">' +
          (s.name || s.code || s.id) +
          "</option>"
        );
      })
      .join("");
    var roleOptions = ['<option value=""></option>']
      .concat(
        state.roles
          .filter(function (r) {
            return r.is_active !== false;
          })
          .map(function (r) {
            return (
              '<option value="' +
              r.id +
              '">' +
              (r.name || r.code || r.id) +
              "</option>"
            );
          })
      )
      .join("");

    container.innerHTML = [
      '<div class="areas-form-panel">',
      "  <h2>" + title + "</h2>",
      '  <form id="areas-edit-form">',
      '    <div class="form-grid">',
      '      <label>Código<input name="code" type="text" ' +
        disableCode +
        ' value="' +
        (area && area.code ? area.code : "") +
        '" /></label>',
      "      <label>" +
        tr("areas.form.name.en", "Nombre (en)") +
        '<input name="name_en" type="text" value="' +
        nameEn +
        '" /></label>',
      "      <label>" +
        tr("areas.form.desc.en", "Descripción (en)") +
        '<textarea name="desc_en">' +
        descEn +
        "</textarea></label>",
      "      <label>" +
        tr("areas.form.name.es", "Nombre (es)") +
        '<input name="name_es" type="text" value="' +
        nameEs +
        '" /></label>',
      "      <label>" +
        tr("areas.form.desc.es", "Descripción (es)") +
        '<textarea name="desc_es">' +
        descEs +
        "</textarea></label>",
      "      <label>" +
        tr("areas.form.source", "Fuente") +
        '<select name="source_id">' +
        sourceOptions +
        "</select></label>",
      "      <label>" +
        tr("areas.form.owner", "Rol dueño") +
        '<select name="owner_role_id">' +
        roleOptions +
        "</select></label>",
      '      <label><input type="checkbox" name="is_active" ' +
        ((area ? area.is_active : true) ? "checked" : "") +
        " /> " +
        tr("areas.form.active", "Activo") +
        "</label>",
      '      <label><input type="checkbox" name="is_public" ' +
        (area && area.is_public ? "checked" : "") +
        " /> " +
        tr("areas.form.public", "Pública") +
        "</label>",
      "    </div>",
      '    <div class="areas-perms-wrap"><h3>' +
        tr("areas.perms.title", "Permisos por rol") +
        '</h3><div id="areas-perms-table"></div></div>',
      '    <div class="areas-form-actions">',
      '      <button type="submit" class="chip primary">' +
        tr("areas.form.save", "Guardar") +
        "</button>",
      '      <button type="button" class="chip" id="areas-cancel">' +
        tr("areas.form.cancel", "Cancelar") +
        "</button>",
      "    </div>",
      "  </form>",
      "</div>",
    ].join("\n");

    var sourceSel = container.querySelector('select[name="source_id"]');
    if (sourceSel && area && area.source_id) {
      sourceSel.value = String(area.source_id);
    }
    var ownerSel = container.querySelector('select[name="owner_role_id"]');
    if (ownerSel && area && area.owner_role_id) {
      ownerSel.value = String(area.owner_role_id);
    }

    var permsTable = container.querySelector("#areas-perms-table");
    var perms = {};
    if (area && area.id) {
      perms = await loadAreaPermissions(area.id);
    } else {
      perms = buildDefaultPermsForNewArea();
    }
    renderPermsTable(permsTable, perms);

    var form = container.querySelector("#areas-edit-form");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        saveArea(form, area || null, perms);
      });
    }
    var cancelBtn = container.querySelector("#areas-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        container.innerHTML = "";
      });
    }
  }

  async function openForm(area) {
    var translations = area ? await loadTranslationsForArea(area.id) : {};
    renderForm(area, translations);
  }

  async function toggleAreaActive(area) {
    if (!area || !area.id) return;
    var client = getClient();
    if (!client) return;
    var next = !area.is_active;
    var res = await client
      .from("areas")
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq("id", area.id);
    if (res && res.error) {
      showMessage(
        "error",
        tr(
          "areas.error.toggle",
          "No se pudo actualizar el estado del área"
        )
      );
      return;
    }
    area.is_active = next;
    renderTable();
  }

  // ---- tabla y paginación ----

  function renderTable() {
    var tbody = document.getElementById("areas-table-body");
    if (!tbody) return;
    var pageData = getPagedAreas();
    state.page = pageData.page;
    var lang = getLang();
    var rows = [];
    pageData.items.forEach(function (a, idx) {
      var index = (pageData.page - 1) * state.pageSize + idx + 1;
      rows.push("<tr>");
      rows.push("<td>" + index + "</td>");
      rows.push("<td>" + (a.code || "") + "</td>");
      rows.push("<td>" + (getDisplayName(a, lang) || "") + "</td>");
      rows.push("<td>" + getSourceName(a.source_id) + "</td>");
      rows.push(
        "<td>" +
          (a.owner_role_id ? getRoleName(a.owner_role_id) : "--") +
          "</td>"
      );
      rows.push(
        '<td><button class="chip small" data-action="toggle-active" data-id="' +
          a.id +
          '">' +
          (a.is_active
            ? tr("areas.list.active", "Activo")
            : tr("areas.list.inactive", "Inactivo")) +
          "</button></td>"
      );
      rows.push(
        '<td><button class="chip small" data-action="edit" data-id="' +
          a.id +
          '">' +
          tr("areas.list.edit", "Editar") +
          "</button></td>"
      );
      rows.push("</tr>");
    });
    if (!rows.length) {
      rows.push(
        '<tr><td colspan="7">' +
          tr("areas.list.empty", "No hay áreas") +
          "</td></tr>"
      );
    }
    tbody.innerHTML = rows.join("");

    tbody.querySelectorAll('[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        var area = state.areas.find(function (a) {
          return String(a.id) === String(id);
        });
        openForm(area || null);
      });
    });
    tbody
      .querySelectorAll('[data-action="toggle-active"]')
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          var area = state.areas.find(function (a) {
            return String(a.id) === String(id);
          });
          toggleAreaActive(area);
        });
      });
  }

  function renderPagination() {
    var pagEl = document.getElementById("areas-pagination");
    if (!pagEl) return;
    var data = getPagedAreas();
    var html = [];
    html.push('<div class="areas-pagination">');
    html.push(
      '<button class="chip" data-nav="prev" ' +
        (data.page <= 1 ? "disabled" : "") +
        ">" +
        tr("areas.pagination.prev", "Anterior") +
        "</button>"
    );
    html.push(
      '<span class="areas-page-indicator">' +
        tr("areas.pagination.page", "Página") +
        " " +
        data.page +
        " / " +
        data.totalPages +
        "</span>"
    );
    html.push(
      '<button class="chip" data-nav="next" ' +
        (data.page >= data.totalPages ? "disabled" : "") +
        ">" +
        tr("areas.pagination.next", "Siguiente") +
        "</button>"
    );
    html.push("</div>");
    pagEl.innerHTML = html.join("");

    var prevBtn = pagEl.querySelector('[data-nav="prev"]');
    var nextBtn = pagEl.querySelector('[data-nav="next"]');
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (state.page > 1) {
          state.page -= 1;
          renderTable();
          renderPagination();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        var dataLocal = getPagedAreas();
        if (state.page < dataLocal.totalPages) {
          state.page += 1;
          renderTable();
          renderPagination();
        }
      });
    }
  }

  // ---- layout principal ----

  function renderLayout() {
    var container = document.getElementById("app-main");
    if (!container) return;
    container.innerHTML = [
      '<div class="panel panel-single areas-view">',
      '  <div class="main-view-header">',
      '    <h1 class="main-view-title">' + tr("areas.title", "Áreas") + "</h1>",
      "  </div>",
      '  <div class="areas-bar">',
      '    <input type="search" id="areas-search" placeholder="' +
        tr("areas.search.placeholder", "Buscar áreas") +
        '" />',
      '    <button class="chip primary" id="areas-new">' +
        tr("areas.new", "Nueva área") +
        "</button>",
      "  </div>",
      '  <div class="areas-table-wrap">',
      '    <table class="areas-table">',
      "      <thead>",
      "        <tr>",
      "          <th>#</th>",
      "          <th>Code</th>",
      "          <th>" + tr("areas.list.name", "Nombre") + "</th>",
      "          <th>" + tr("areas.list.source", "Fuente") + "</th>",
      "          <th>" + tr("areas.list.owner", "Rol dueño") + "</th>",
      "          <th>" + tr("areas.list.activeCol", "Activo") + "</th>",
      "          <th>" + tr("areas.list.actions", "Acciones") + "</th>",
      "        </tr>",
      "      </thead>",
      '      <tbody id="areas-table-body"></tbody>',
      "    </table>",
      "  </div>",
      '  <div id="areas-pagination"></div>',
      '  <div id="areas-form"></div>',
      "</div>",
    ].join("\n");

    var searchInput = container.querySelector("#areas-search");
    if (searchInput) {
      searchInput.value = state.search || "";
      searchInput.addEventListener("input", function () {
        state.search = searchInput.value || "";
        state.page = 1;
        renderTable();
        renderPagination();
      });
    }
    var newBtn = container.querySelector("#areas-new");
    if (newBtn) {
      newBtn.addEventListener("click", function () {
        openForm(null);
      });
    }
  }

  // ---- ciclo de vida ----

  async function refresh() {
    if (!isAdminLikeUser()) {
      showMessage(
        "error",
        tr("areas.perms.denied", "No tienes permisos para áreas")
      );
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("navigator");
      }
      return;
    }
    await loadAreas();
    await loadTranslationsForLang(getLang());
    renderTable();
    renderPagination();
    var formWrap = document.getElementById("areas-form");
    if (formWrap) formWrap.innerHTML = "";
  }

  async function render() {
    if (!isAdminLikeUser()) {
      showMessage(
        "error",
        tr("areas.perms.denied", "No tienes permisos para áreas")
      );
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("navigator");
      }
      return;
    }
    await loadSources();
    await loadRolesCatalog();
    await loadAreas();
    await loadTranslationsForLang(getLang());
    renderLayout();
    renderTable();
    renderPagination();
  }

  function show() {
    render();
  }

  function hide() {
    var container = document.getElementById("app-main");
    if (container) container.innerHTML = "";
  }

  function init() {
    // reservado para futura lógica si hace falta
  }

  return {
    init: init,
    render: render,
    show: show,
    hide: hide,
    refresh: refresh,
  };
})();
