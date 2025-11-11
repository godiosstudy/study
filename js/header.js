(function () {
  // Detecta y fija los IDs correctos para los <use> del header
  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function setUseHref(useEl, url, id) {
    if (!useEl || !id) return;
    const hrefVal = `${url}#${id}`;
    try { useEl.setAttribute("href", hrefVal); } catch {}
    try { useEl.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", hrefVal); } catch {}
  }

  function bestMatchId(symbolIds, candidates) {
    // Prioriza coincidencia exacta, luego contiene, luego regex “parecida”
    for (const c of candidates) {
      if (symbolIds.has(c)) return c;
    }
    for (const id of symbolIds) {
      if (candidates.some(c => id.includes(c))) return id;
    }
    // fallback: cualquier id que contenga “user|account|person” o “pref|set|gear|cog”
    const rx = new RegExp(candidates.join("|"), "i");
    for (const id of symbolIds) if (rx.test(id)) return id;
    return null;
  }

  async function fixIcons() {
    const usersUse = document.querySelector("#hdr-users svg use");
    const prefsUse = document.querySelector("#hdr-preferences svg use");
    // Si no existen los botones, nada que hacer
    if (!usersUse && !prefsUse) return;

    const spriteUrl = "img/icons.svg";
    let text = "";
    try {
      const res = await fetch(spriteUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      text = await res.text();
    } catch (e) {
      // Si no pudimos leer el sprite, dejamos los href tal cual
      console.warn("[header icons] No se pudo leer img/icons.svg:", e);
      return;
    }

    // Parseamos el SVG y recolectamos IDs de <symbol>
    let ids = new Set();
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "image/svg+xml");
      const symbols = Array.from(doc.querySelectorAll("symbol[id]"));
      symbols.forEach(s => ids.add(s.getAttribute("id")));
    } catch (e) {
      console.warn("[header icons] No se pudo parsear icons.svg:", e);
      return;
    }
    if (!ids.size) return;

    // Resolver IDs
    const userCandidates = [
      "users","user","account","person","people","profile","login","signin"
    ];
    const prefCandidates = [
      "preferences","settings","gear","cog","cogs","options","tools","setup"
    ];

    const usersId = bestMatchId(ids, userCandidates);
    const prefsId = bestMatchId(ids, prefCandidates);

    if (usersUse && usersId) setUseHref(usersUse, spriteUrl, usersId);
    if (prefsUse && prefsId) setUseHref(prefsUse, spriteUrl, prefsId);
  }

  onReady(() => {
    // No agregamos handlers pesados; solo resolvemos íconos una vez
    fixIcons();
  });
})();
