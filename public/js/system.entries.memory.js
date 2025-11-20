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

    var key = makeKey(prefs);

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
        .eq("language_code", prefs.language || "es")
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
        .eq("language_code", prefs.language || "es")
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

        if (total > 0 && typeof onProgress === "function") {
          var pct = Math.round((loaded / total) * 100);
          if (pct > 100) pct = 100;

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

  window.EntriesMemory = {
    loadForPrefs: loadForPrefs,
    getRows: getRows,
    search: search,
  };
})();
