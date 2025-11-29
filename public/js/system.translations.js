// system.translations.js – carga y acceso a traducciones de sistema desde public.system_translations
(function () {
  var store = {};
  var _loaded = false;

  function resetStore() {
    store = {};
    _loaded = false;
  }

  function setValue(entityType, entityId, field, lang, value) {
    if (!entityType || !entityId || !field || !lang) return;
    var typeKey = String(entityType);
    var idKey = String(entityId);
    var fieldKey = String(field);
    var langKey = String(lang);

    if (!store[typeKey]) store[typeKey] = {};
    if (!store[typeKey][idKey]) store[typeKey][idKey] = {};
    if (!store[typeKey][idKey][fieldKey]) store[typeKey][idKey][fieldKey] = {};

    store[typeKey][idKey][fieldKey][langKey] = value;
  }

  async function load(langs) {
    var langList = Array.isArray(langs) ? langs.slice() : [];
    if (langList.indexOf("en") === -1) langList.push("en");

    resetStore();

    try {
      if (
        !window.BackendSupabase ||
        typeof window.BackendSupabase.client !== "function" ||
        typeof window.BackendSupabase.isConfigured !== "function" ||
        !window.BackendSupabase.isConfigured()
      ) {
        console.warn("[SystemTranslations] Supabase client not available/configured");
        return store;
      }

      var client = window.BackendSupabase.client();
      if (!client) {
        console.warn("[SystemTranslations] Supabase client unavailable");
        return store;
      }

      var res = await client
        .from("system_translations")
        .select("entity_type, entity_id, field, lang, value")
        .in("lang", langList);

      if (res && res.error) {
        console.error("[SystemTranslations] load error", res.error);
        return store;
      }

      var rows = (res && res.data) || [];
      rows.forEach(function (row) {
        setValue(row.entity_type, row.entity_id, row.field, row.lang, row.value);
      });

      _loaded = true;
    } catch (e) {
      console.error("[SystemTranslations] load exception", e);
    }

    return store;
  }

  async function ensureLoaded(langs) {
    if (_loaded) return store;
    return load(langs);
  }

  function get(entityType, entityId, field, lang, fallback) {
    var typeKey = String(entityType || "");
    var idKey = String(entityId || "");
    var fieldKey = String(field || "");
    var langKey = String(lang || "");

    if (
      store[typeKey] &&
      store[typeKey][idKey] &&
      store[typeKey][idKey][fieldKey]
    ) {
      var byField = store[typeKey][idKey][fieldKey];
      if (langKey && byField[langKey]) return byField[langKey];
      if (byField.en) return byField.en;
    }
    return typeof fallback !== "undefined" ? fallback : "";
  }

  window.SystemTranslations = {
    store: store,
    load: load,
    ensureLoaded: ensureLoaded,
    get: get,
    reset: resetStore,
  };

  // Ejemplo:
  // const label = SystemTranslations.get('role', role.id, 'name', currentLang, role.name);
})();
