(function () {
  // --- util onReady (tu helper original simplificado) ---
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  // --- helpers para idioma y traducciones ---

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

  function getDomainTitle() {
    // fallback por si falta traducción
    let label = "Study.GODiOS.org";

    try {
      const TR = window.I18n && window.I18n.__TR;
      const lang = currentLang();

      if (
        TR &&
        TR[lang] &&
        TR[lang].domain &&
        typeof TR[lang].domain.title === "string"
      ) {
        label = TR[lang].domain.title;
      }
    } catch (e) {
      console.warn("[header] Error leyendo domain.title", e);
    }

    return label;
  }

  function applyDomain() {
    const el = document.getElementById("hdr-domain");
    if (!el) return;
    el.textContent = getDomainTitle();
  }

  // --- tu lógica original de íconos con <use> ---

  function setUseHref(useEl, url, id) {
    if (!useEl || !id) return;
    const hrefVal = `${url}#${id}`;
    try {
      useEl.setAttribute("href", hrefVal);
    } catch {}
    try {
      useEl.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        hrefVal
      );
    } catch {}
  }

  function bestMatchId(symbolIds, candidates) {
    // Prioriza coincidencia exacta, luego contiene, luego regex “parecida”
    for (const c of candidates) {
      if (symbolIds.has(c)) return c;
    }
    for (const id of symbolIds) {
      if (candidates.some((c) => id.includes(c))) return id;
    }
    const rx = new RegExp(candidates.join("|"), "i");
    for (const id of symbolIds) if (rx.test(id)) return id;
    return null;
  }

  async function fixIcons() {
    const usersUse = document.querySelector("#hdr-users svg use");
    const prefsUse = document.querySelector("#hdr-preferences svg use");
    // Si no existen los botones, nada que hacer
    if (!usersUse && !prefsUse) return;

    const spriteUrl = "public/img/icons.svg";
    let text = "";
    try {
      const res = await fetch(spriteUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      text = await res.text();
    } catch (e) {
      console.warn("[header icons] No se pudo leer img/icons.svg:", e);
      return;
    }

    let ids = new Set();
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "image/svg+xml");
      const symbols = Array.from(doc.querySelectorAll("symbol[id]"));
      symbols.forEach((s) => ids.add(s.getAttribute("id")));
    } catch (e) {
      console.warn("[header icons] No se pudo parsear icons.svg:", e);
      return;
    }
    if (!ids.size) return;

    const userCandidates = [
      "users",
      "user",
      "account",
      "person",
      "people",
      "profile",
      "login",
      "signin",
    ];
    const prefCandidates = [
      "preferences",
      "settings",
      "gear",
      "cog",
      "cogs",
      "options",
      "tools",
      "setup",
    ];

    const usersId = bestMatchId(ids, userCandidates);
    const prefsId = bestMatchId(ids, prefCandidates);

    if (usersUse && usersId) setUseHref(usersUse, spriteUrl, usersId);
    if (prefsUse && prefsId) setUseHref(prefsUse, spriteUrl, prefsId);
  }

  // --- init combinado ---

  onReady(function () {
    // aplicar el domain según idioma actual
    applyDomain();

    // arreglar íconos del sprite (si todavía usás #hdr-users / #hdr-preferences con <use>)
    fixIcons();

    // cuando cambian preferencias (incluye idioma en PrefsStore)
    window.addEventListener("prefs:applied", applyDomain);
  });
})();
