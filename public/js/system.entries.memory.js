// system.entries.memory.js – cache en memoria de entries + búsqueda con Fuse.js
;(function () {
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
      console.warn("[EntriesMemory] error obteniendo cliente Supabase", e);
    }
    return null;
  }

  function normalizeText(str) {
    if (!str) return "";
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function makeKey(prefs) {
    var lang = (prefs && prefs.language) || "es";
    var col  = (prefs && prefs.collection) || "";
    var cor  = (prefs && prefs.corpus) || "";
    return lang + "::" + col + "::" + cor;
  }

  var currentKey = null;
  var rows = [];
  var fuse = null;
  var loading = false;
  var waiters = [];
  // Meta caches: colecciones por idioma y corpus por idioma+colección
  var metaCollectionsByLang = {};          // { 'es': ['Génesis', 'Éxodo', ...] }
  var metaCorpusByLangCollection = {};     // { 'es::Génesis': ['RV1960', ...] }
  async function resolveCorpusLanguage(collection, corpus, fallbackLang) {
    var client = getSupabaseClient();
    if (!client || !collection || !corpus) return fallbackLang || "es";
    try {
      var res = await client
        .from("entries_meta")
        .select("language_code")
        .eq("level_1", collection)
        .eq("level_2", corpus)
        .limit(1);
      if (res && !res.error && res.data && res.data.length) {
        var lc = res.data[0].language_code;
        if (lc) return lc;
      }
    } catch (e) {
      console.warn("[EntriesMemory] resolveCorpusLanguage error", e);
    }
    return fallbackLang || "es";
  }


  function buildSearchFields(row) {
    var parts = [];
    if (row.level_1) parts.push(row.level_1);
    if (row.level_2) parts.push(row.level_2);
    if (row.level_3) parts.push(row.level_3);
    if (row.level_4) parts.push(row.level_4);
    if (row.level_5) parts.push(row.level_5);
    if (row.level_6) parts.push(row.level_6);
    if (row.level_7) parts.push(row.level_7);
    parts.push(String(row.entry_order || ""));

    var joined = parts.join(" ");
    row._search_raw = joined;
    row._search_norm = normalizeText(joined);
    return row;
  }


  function makeSnippetFromRow(row) {
    if (!row) return "";
    try {
      var refParts = [];
      if (row.level_4) {
        refParts.push(String(row.level_4));
      }

      var capVers = "";
      if (row.level_5) {
        capVers += String(row.level_5);
      }
      if (row.level_6) {
        capVers += ":" + String(row.level_6);
      }
      if (capVers) {
        refParts.push(capVers);
      }

      var prefix = refParts.join(" ");
      var txt = row.level_7 ? String(row.level_7) : "";
      var full = prefix ? (txt ? prefix + " " + txt : prefix) : txt;

      return full || "";
    } catch (e) {
      return "";
    }
  }

  function buildFuse(data) {
    if (!window.Fuse) {
      console.warn("[EntriesMemory] Fuse.js no está disponible");
      return null;
    }

    return new window.Fuse(data, {
      includeScore: true,
      includeMatches: false,
      threshold: 0.3,
      ignoreLocation: true,
      keys: [
        "_search_norm",
        "level_4",
        "level_5",
        "level_6",
        "level_7"
      ]
    });
  }

  async function loadForPrefs(prefs, onProgress) {
    var client = getSupabaseClient();
    if (!client) {
      console.warn("[EntriesMemory] Supabase no configurado");
      return { key: null, rows: [], fuse: null };
    }

    var derivedLang = await resolveCorpusLanguage(
      prefs && prefs.collection,
      prefs && prefs.corpus,
      (prefs && prefs.language) || "es"
    );
    var key = makeKey({ language: derivedLang, collection: prefs.collection, corpus: prefs.corpus });

    if (currentKey === key && rows.length && fuse) {
      if (typeof onProgress === "function") {
        var snippet = "";
        try {
          var maxSnippets = 64;
          var snippets = [];
          for (var i = 0; i < rows.length && snippets.length < maxSnippets; i++) {
            var r = rows[i];
            var sn = makeSnippetFromRow(r);
            if (sn) {
              snippets.push(sn);
            }
          }
          if (snippets.length) {
            snippet = snippets[0];
          }
        } catch (eSnippet) {}
        onProgress(100, snippet);
      }
      return { key: currentKey, rows: rows, fuse: fuse };
    }

    if (loading && currentKey === key) {
      return new Promise(function (resolve) {
        waiters.push(resolve);
      });
    }

    loading = true;
    currentKey = key;
    rows = [];
    fuse = null;
    loadForPrefs._stepPct = 0;

    var snippets = [];
    var maxSnippets = 64;

    if (typeof onProgress === "function") {
      onProgress(0, "");
    }

    var total = 0;
    try {
      var countRes = await client
        .from("entries")
        .select("id", { count: "exact", head: true })
        .eq("language_code", derivedLang || prefs.language || "es")
        .eq("level_1", prefs.collection)
        .eq("level_2", prefs.corpus);

      if (countRes && !countRes.error) {
        total = countRes.count || 0;
      } else if (countRes && countRes.error) {
        console.warn("[EntriesMemory] count error", countRes.error);
      }
    } catch (eCount) {
      console.warn("[EntriesMemory] count exception", eCount);
    }

    var pageSize = 1000;
    var loaded = 0;
    var from = 0;
    var done = false;

    while (!done) {
      var to = from + pageSize - 1;
      var q = client
        .from("entries")
        .select(
          "id, language_code, entry_order, level_1, level_2, level_3, level_4, level_5, level_6, level_7"
        )
        .eq("language_code", derivedLang || prefs.language || "es")
        .eq("level_1", prefs.collection)
        .eq("level_2", prefs.corpus)
        .order("entry_order", { ascending: true })
        .range(from, to);

      try {
        var res = await q;
        if (res.error) {
          console.warn("[EntriesMemory] load error", res.error);
          break;
        }

        var chunk = res.data || [];
        if (!chunk.length) {
          done = true;
          break;
        }

        chunk.forEach(function (row) {
          rows.push(buildSearchFields(row));

          if (row && snippets.length < maxSnippets) {
            try {
              var sn = makeSnippetFromRow(row);
              if (sn) {
                snippets.push(sn);
              }
            } catch (eSnippet) {}
          }
        });

        loaded += chunk.length;
        from += pageSize;

        if (typeof onProgress === "function") {
          var pct;
          if (total > 0) {
            pct = Math.round((loaded / total) * 100);
            if (pct > 100) pct = 100;
          } else {
            // Fallback cuando no tenemos total confiable:
            // avanzamos en pasos suaves hasta un máximo del 90%,
            // dejando el 100% para el final fuera del bucle.
            if (typeof loadForPrefs._stepPct !== "number") {
              loadForPrefs._stepPct = 0;
            }
            loadForPrefs._stepPct += 5;
            if (loadForPrefs._stepPct > 90) {
              loadForPrefs._stepPct = 90;
            }
            pct = loadForPrefs._stepPct;
          }

          var snippetText = "";
          if (snippets.length) {
            var idx = Math.floor((pct / 100) * snippets.length);
            if (idx >= snippets.length) idx = snippets.length - 1;
            snippetText = snippets[idx];
          }

          onProgress(pct, snippetText);
        }

        if (chunk.length < pageSize) {
          done = true;
        }
      } catch (e) {
        console.warn("[EntriesMemory] chunk load exception", e);
        break;
      }
    }

    if (typeof onProgress === "function") {
      var snippetText = "";
      if (snippets && snippets.length) {
        snippetText = snippets[snippets.length - 1];
      }
      onProgress(100, snippetText);
    }

    fuse = buildFuse(rows);
    loading = false;

    var result = { key: currentKey, rows: rows, fuse: fuse };

    if (waiters.length) {
      waiters.forEach(function (fn) {
        try {
          fn(result);
        } catch (e) {}
      });
      waiters = [];
    }

    return result;
  }

  function getRows() {
    return rows.slice();
  }

  function search(query) {
    if (!query || !query.trim()) return [];
    if (!rows.length || !fuse) return [];

    var qNorm = normalizeText(query);
    var fuseRes = fuse.search(qNorm);

    return fuseRes.map(function (r) {
      return r.item;
    });
  }

  async function preloadMetaForLang(langCode) {
    var lang = langCode || "es";
    if (metaCollectionsByLang[lang]) return;

    var client = getSupabaseClient();
    if (!client) return;

    try {
      var collSet = new Set();
      var corpusMap = {}; // { collection: Set(corpus) }

      // ✅ Usamos la vista entries_meta para NO recorrer toda la tabla entries
      var res = await client
        .from("entries_meta")
        .select("level_1, level_2")
        .eq("language_code", lang);

      if (res.error) {
        console.warn("[EntriesMemory] meta load error", res.error);
        return;
      }

      var data = res.data || [];

      data.forEach(function (row) {
        var col = row && row.level_1;
        var cor = row && row.level_2;
        if (col) collSet.add(col);
        if (col && cor) {
          var key = String(col);
          var s = corpusMap[key];
          if (!s) {
            s = new Set();
            corpusMap[key] = s;
          }
          s.add(cor);
        }
      });

      metaCollectionsByLang[lang] = Array.from(collSet).sort();

      Object.keys(corpusMap).forEach(function (col) {
        var key = lang + "::" + col;
        metaCorpusByLangCollection[key] = Array.from(corpusMap[col]).sort();
      });
    } catch (e) {
      console.warn("[EntriesMemory] meta load exception", e);
    }

  }

  function getCollectionsForLang(langCode) {
    var lang = langCode || "es";
    return metaCollectionsByLang[lang] || null;
  }

  function getCorpusForLangCollection(langCode, collectionValue) {
    var lang = langCode || "es";
    var key = lang + "::" + (collectionValue || "");
    return metaCorpusByLangCollection[key] || null;
  }

  window.EntriesMemory = {
    loadForPrefs: loadForPrefs,
    resetCache: function () {
      currentKey = null;
      rows = [];
      fuse = null;
      loading = false;
      waiters = [];
      loadForPrefs._stepPct = 0;
    },
    getRows: getRows,
    search: search,
    preloadMetaForLang: preloadMetaForLang,
    getCollectionsForLang: getCollectionsForLang,
    getCorpusForLangCollection: getCorpusForLangCollection,
  };
})();
