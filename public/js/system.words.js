// system.words.js - diccionario de textos desde system_words
window.SystemWords = (function () {
  var currentLang = "en";
  var dictionary = {};
  var isLoaded = false;

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
      console.warn("[SystemWords] Supabase client error", e);
    }
    return null;
  }

  async function loadForLanguage(lang) {
    var client = getClient();
    currentLang = lang || "en";
    dictionary = {};
    isLoaded = false;

    if (!client) {
      console.warn("[SystemWords] no Supabase client, using fallbacks");
      return;
    }

    try {
      var res = await client.from("system_words").select("word, " + currentLang);
      if (res.error) {
        console.warn("[SystemWords] load error", res.error);
        return;
      }
      (res.data || []).forEach(function (row) {
        var val = row[currentLang];
        dictionary[row.word] = val == null ? "" : String(val);
      });
      isLoaded = true;
    } catch (e) {
      console.warn("[SystemWords] load exception", e);
    }
  }

  async function init(lang) {
    var l = lang;
    try {
      if (
        !l &&
        window.SystemLanguage &&
        typeof window.SystemLanguage.getCurrent === "function"
      ) {
        l = window.SystemLanguage.getCurrent() || "en";
      }
    } catch (e) {}
    if (!l) l = "en";
    await loadForLanguage(l);
  }

  function t(word, fallback) {
    if (!isLoaded) {
      return fallback != null ? fallback : word;
    }
    var val = dictionary[word];
    if (val && val.trim() !== "") {
      return val;
    }
    return fallback != null ? fallback : word;
  }

  return {
    init: init,
    loadForLanguage: loadForLanguage,
    t: t,
  };
})();
