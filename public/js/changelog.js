;(function(){
  function stripBOM(str){ return str && str.charCodeAt(0)===0xFEFF ? str.slice(1) : str; }
  function parseJSONLoose(text){
    if (typeof text !== 'string') return null;
    let src = stripBOM(text);
    src = src.replace(/\/\*[\s\S]*?\*\//g, '');
    src = src.replace(/(^|\s)\/\/.*$/gm, '');
    src = src.replace(/,\s*(\]|\})/g, '$1');
    src = src.trim();
    try { return JSON.parse(src); } catch(e){ console.warn('parseJSONLoose failed:', e); return null; }
  }
  function parseVersionPayload(payload){
    let current = null;
    let history = [];
    if (Array.isArray(payload)){ history = payload; if (history.length && typeof history[0]==='object') current = history[0].version || history[0].v || null; }
    else if (payload && typeof payload === 'object'){
      if (payload.current) current = payload.current;
      if (Array.isArray(payload.history)) history = payload.history;
      if (!current && Array.isArray(payload.versions) && payload.versions.length){ current = payload.versions[0].version || payload.versions[0].v || null; history = payload.versions; }
      if (!current && payload.version) current = payload.version;
    }
    const norm = (history||[]).map(item=>{
      if (typeof item === 'string'){
        const parts = item.split('|').map(s=>s.trim()).filter(Boolean);
        const version = parts.shift() || 'v?';
        // allow date with time, e.g., 2025-11-09 19:00
        const date = (parts.length && /^\d{4}-\d{2}-\d{2}(\s+\d{2}:\d{2})?/.test(parts[0])) ? parts.shift() : null;
        return { version, date, notes: parts };
      }
      return item;
    });
    return { current, history: norm };
  }

  function ensureModal(){
    if (document.getElementById('changelog-modal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'changelog-modal';
    wrap.className = 'changelog-modal';
    wrap.setAttribute('aria-hidden','true');
    wrap.setAttribute('inert','');
    wrap.innerHTML = `
      <div class="cl-dialog" role="dialog" aria-modal="true" aria-labelledby="cl-title" tabindex="-1">
        <header class="cl-head">
          <h2 id="cl-title">Changelog</h2>
          <button class="cl-close" id="cl-close" aria-label="Cerrar">×</button>
        </header>
        <div class="cl-body" id="cl-body"></div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (e)=>{ if (e.target === wrap) close(); });
  }

  function renderHistory(history){
    const body = document.getElementById('cl-body');
    if (!body) return;
    if (!history || !history.length){ body.innerHTML = '<p>No hay historial disponible.</p>'; return; }
    const html = history.map(item=>{
      const v = item.version || item.v || 'v?';
      const d = item.date ? `<time>${item.date}</time>` : '';
      const notes = Array.isArray(item.notes) && item.notes.length ? `<ul>${item.notes.map(n=>`<li>${n}</li>`).join('')}</ul>` : (item.note ? `<p>${item.note}</p>` : '');
      return `<article class="cl-entry">
        <div class="cl-meta"><span class="cl-ver">${v}</span>${d?` · ${d}`:''}</div>
        ${notes}
      </article>`;
    }).join('');
    body.innerHTML = html;
  }

  function open(){
    const m = document.getElementById('changelog-modal');
    if (!m) return;
    m.classList.add('open');
    m.removeAttribute('aria-hidden');
    m.removeAttribute('inert');
    const dlg = m.querySelector('.cl-dialog');
    (dlg || m).focus();
  }
  function close(opener){
    const m = document.getElementById('changelog-modal');
    if (!m) return;
    if (opener) try{ opener.focus(); } catch {}
    if (document.activeElement && m.contains(document.activeElement)) { try{ document.activeElement.blur(); } catch {} }
    m.classList.remove('open');
    m.setAttribute('aria-hidden','true');
    m.setAttribute('inert','');
  }

  async function init(opts){
    const targetId = (opts && opts.targetId) || 'ftr-changelog';
    const versionUrl = (opts && opts.versionUrl) || 'version.json';
    const host = document.getElementById(targetId);
    if (!host) return;

    let payload = null;
    try { const res = await fetch(versionUrl, { cache: 'no-store' }); if (res.ok) payload = parseJSONLoose(await res.text()); } catch(e){ console.warn('No se pudo leer version.json', e); }
    const { current, history } = parseVersionPayload(payload || {});

    host.innerHTML = '';
    const btn = document.createElement('button');
    btn.id = 'cl-btn';
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = current || 'v0.0.0';
    btn.setAttribute('aria-label', 'Ver historial de cambios');
    host.appendChild(btn);

    ensureModal();
    renderHistory(history || []);

    btn.addEventListener('click', ()=> open());
    document.getElementById('cl-close').addEventListener('click', ()=> close(btn));
    document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') close(btn); });
  }

  window.Changelog = { init };
})();