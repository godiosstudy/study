// system.languages.js - administración de system_words (idiomas)
window.SystemLanguages = (function () {
  var state = {
    words: [],
    search: "",
    page: 1,
    pageSize: 50,
    currentLang: "en",
    langColumns: ["en", "es", "pt", "fr"],
    completeLangs: [],
    dirty: {},
  };

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
      console.warn("[SystemLanguages] Supabase client error", e);
    }
    return null;
  }

  function getUiLang() {
    try {
      if (window.SystemLanguage && typeof window.SystemLanguage.getCurrent === "function") {
        return window.SystemLanguage.getCurrent() || "en";
      }
    } catch (e) {}
    return "en";
  }

  function tr(key, fallback) {
    var lang = getUiLang();
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

  function showMessage(type, text) {
    try {
      if (window.HeaderMessages && typeof window.HeaderMessages.show === "function") {
        window.HeaderMessages.show(text, { type: type || "info", duration: 7000 });
      } else {
        console.log("[SystemLanguages][" + type + "]", text);
      }
    } catch (e) {}
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

  function detectPreferredLang() {
    try {
      if (window.AuthSession && typeof window.AuthSession.getProfile === "function") {
        var prof = window.AuthSession.getProfile();
        if (prof && prof.p_language && state.langColumns.indexOf(prof.p_language) !== -1) {
          return prof.p_language;
        }
      }
    } catch (e) {}
    try {
      var stored = localStorage.getItem("gods_lang");
      if (stored && state.langColumns.indexOf(stored) !== -1) {
        return stored;
      }
    } catch (e) {}
    try {
      var nav = (navigator && (navigator.language || (navigator.languages && navigator.languages[0]))) || "";
      var short = String(nav).slice(0, 2).toLowerCase();
      if (short && state.langColumns.indexOf(short) !== -1) {
        return short;
      }
    } catch (e) {}
    return "en";
  }

  async function loadAvailableLanguageView() {
    var client = getClient();
    if (!client) return;
    try {
      var res = await client.from("system_languages_available").select("lang, is_complete");
      if (res && res.error) {
        console.warn("[SystemLanguages] available langs error", res.error);
        return;
      }
      state.completeLangs = (res.data || [])
        .filter(function (row) { return row.is_complete; })
        .map(function (row) { return row.lang; });
      if (state.completeLangs.indexOf("en") === -1) {
        state.completeLangs.push("en");
      }
    } catch (e) {
      console.warn("[SystemLanguages] available langs exception", e);
    }
  }

  async function loadWords() {
    var client = getClient();
    if (!client) return;
    var res = await client
      .from("system_words")
      .select("word, en, es, pt, fr")
      .order("word", { ascending: true });
    if (res && res.error) {
      console.warn("[SystemLanguages] loadWords error", res.error);
      return;
    }
    state.words = res.data || [];
  }

  function getFilteredWords() {
    var term = (state.search || "").toLowerCase().trim();
    if (!term) return state.words;
    var col = state.currentLang || "en";
    return state.words.filter(function (row) {
      var w = (row.word || "").toLowerCase();
      var val = (row[col] || "").toLowerCase();
      return w.indexOf(term) !== -1 || val.indexOf(term) !== -1;
    });
  }

  function getPagedWords() {
    var list = getFilteredWords();
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

  function renderPagination() {
    var el = document.getElementById("languages-pagination");
    if (!el) return;
    var data = getPagedWords();
    var html = [];
    html.push('<div class="languages-pagination">');
    html.push(
      '<button class="chip" data-nav="prev" ' +
        (data.page <= 1 ? "disabled" : "") +
        ">" +
        tr("languages.pagination.prev", "Anterior") +
        "</button>"
    );
    html.push(
      '<span class="languages-page-indicator">' +
        tr("languages.pagination.page", "Página") +
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
        tr("languages.pagination.next", "Siguiente") +
        "</button>"
    );
    html.push("</div>");
    el.innerHTML = html.join("");

    var prev = el.querySelector('[data-nav="prev"]');
    var next = el.querySelector('[data-nav="next"]');
    if (prev) {
      prev.addEventListener("click", function () {
        if (state.page > 1) {
          state.page -= 1;
          renderTable();
          renderPagination();
        }
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        var dataLocal = getPagedWords();
        if (state.page < dataLocal.totalPages) {
          state.page += 1;
          renderTable();
          renderPagination();
        }
      });
    }
  }

  function renderTable() {
    var tbody = document.getElementById("languages-table-body");
    if (!tbody) return;
    var data = getPagedWords();
    var col = state.currentLang || "en";
    var rows = [];
    data.items.forEach(function (row, idx) {
      var index = (data.page - 1) * state.pageSize + idx + 1;
      var value = state.dirty.hasOwnProperty(row.word) ? state.dirty[row.word] : row[col] || "";
      rows.push("<tr>");
      rows.push("<td>" + index + "</td>");
      rows.push("<td>" + (row.word || "") + "</td>");
      rows.push(
        '<td><input type="text" class="lang-edit-input" data-word="' +
          row.word +
          '" value="' +
          (value || "") +
          '"/></td>'
      );
      rows.push("</tr>");
    });
    if (!rows.length) {
      rows.push('<tr><td colspan="3">' + tr("languages.list.empty", "No hay registros") + "</td></tr>");
    }
    tbody.innerHTML = rows.join("");

    tbody.querySelectorAll(".lang-edit-input").forEach(function (input) {
      input.addEventListener("input", function () {
        var w = input.getAttribute("data-word");
        var val = input.value || "";
        state.dirty[w] = val;
      });
    });
  }

  function renderLayout() {
    var container = document.getElementById("app-main");
    if (!container) return;
    var langOptions = state.langColumns
      .map(function (c) {
        var complete = state.completeLangs.indexOf(c) !== -1;
        var label = c + (complete ? " (OK)" : " (incompleto)");
        var sel = state.currentLang === c ? "selected" : "";
        return '<option value="' + c + '" ' + sel + ">" + label + "</option>";
      })
      .join("");

    container.innerHTML = [
      '<div class="panel panel-single languages-view">',
      '  <div class="main-view-header">',
      '    <h1 class="main-view-title">' + tr("languages.title", "Languages / Idiomas") + "</h1>",
      "  </div>",
      '  <div class="languages-bar">',
      '    <label>' + tr("languages.select", "Language:") + ' <select id="languages-current-select">' + langOptions + "</select></label>",
      '    <input type="search" id="languages-search" placeholder="' + tr("languages.search.placeholder", "Buscar por palabra o texto") + '" />',
      '    <button class="chip primary" id="languages-save">' + tr("languages.save", "Guardar") + "</button>",
      "  </div>",
      '  <div class="languages-table-wrap">',
      '    <table class="languages-table">',
      "      <thead>",
      "        <tr>",
      "          <th>#</th>",
      "          <th>word</th>",
      "          <th>" + (state.currentLang || "lang") + "</th>",
      "        </tr>",
      "      </thead>",
      '      <tbody id="languages-table-body"></tbody>',
      "    </table>",
      "  </div>",
      '  <div id="languages-pagination"></div>',
      "</div>",
    ].join("\n");

    var select = container.querySelector("#languages-current-select");
    if (select) {
      select.addEventListener("change", function () {
        state.currentLang = select.value || "en";
        state.search = "";
        state.page = 1;
        state.dirty = {};
        renderLayout();
        renderTable();
        renderPagination();
      });
    }

    var searchInput = container.querySelector("#languages-search");
    if (searchInput) {
      searchInput.value = state.search || "";
      searchInput.addEventListener("input", function () {
        state.search = searchInput.value || "";
        state.page = 1;
        renderTable();
        renderPagination();
      });
    }

    var saveBtn = container.querySelector("#languages-save");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        saveChanges();
      });
    }
  }

  async function saveChanges() {
    var keys = Object.keys(state.dirty || {});
    if (!keys.length) {
      showMessage("info", tr("languages.save.nothing", "No hay cambios para guardar"));
      return;
    }
    var client = getClient();
    if (!client) return;
    try {
      for (var i = 0; i < keys.length; i++) {
        var w = keys[i];
        var payload = { word: w };
        payload[state.currentLang] = state.dirty[w];
        var res = await client.from("system_words").upsert(payload);
        if (res && res.error) {
          throw res.error;
        }
      }
      showMessage("success", tr("languages.save.ok", "Cambios guardados"));
      state.dirty = {};
      await loadWords();
      renderTable();
      renderPagination();
    } catch (e) {
      console.error("[SystemLanguages] saveChanges error", e);
      showMessage("error", tr("languages.save.error", "No se pudieron guardar los cambios"));
    }
  }

  async function ensureLang() {
    if (!state.currentLang) {
      var pref = detectPreferredLang();
      state.currentLang = state.langColumns.indexOf(pref) !== -1 ? pref : "en";
    }
  }

  async function show() {
    if (!isAdminLikeUser()) {
      showMessage("error", tr("languages.perms.denied", "No tienes permisos para idiomas"));
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("navigator");
      }
      return;
    }
    await ensureLang();
    await loadAvailableLanguageView();
    await loadWords();
    renderLayout();
    renderTable();
    renderPagination();
  }

  async function refresh() {
    if (!isAdminLikeUser()) {
      showMessage("error", tr("languages.perms.denied", "No tienes permisos para idiomas"));
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("navigator");
      }
      return;
    }
    await loadAvailableLanguageView();
    await loadWords();
    renderLayout();
    renderTable();
    renderPagination();
  }

  function hide() {
    var container = document.getElementById("app-main");
    if (container) container.innerHTML = "";
  }

  function init() {
    // reservado para lógica futura
  }

  return {
    init: init,
    show: show,
    hide: hide,
    refresh: refresh,
  };
})();
