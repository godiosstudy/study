// public/js/changelog.js
;(function () {
  const VERSION_URL = 'version.json';

  function parseJSONLoose(text) {
    text = text.trim();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      const lastBracket = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
      if (lastBracket > 0) {
        const sliced = text.slice(0, lastBracket + 1);
        try {
          return JSON.parse(sliced);
        } catch (e2) {
          console.warn('parseJSONLoose fallback failed:', e2);
        }
      }
      console.warn('parseJSONLoose failed:', e);
      return null;
    }
  }

  function renderChangelogScreen(entries) {
    if (!window.AppMain || typeof window.AppMain.renderScreen !== 'function') {
      console.warn('[changelog] AppMain.renderScreen no está disponible');
      return;
    }

    // título de la solapa
    if (typeof window.AppMain.setViewTitle === 'function') {
      const lang = (window.PrefsStore && window.PrefsStore.load && window.PrefsStore.load().language) || 'es';
      const label = lang === 'es' ? 'Changelog' : 'Changelog';
      window.AppMain.setViewTitle(label);
    }

    window.AppMain.renderScreen(function (root) {
      const sec = document.createElement('section');
      sec.className = 'panel panel-single cl-panel';
      sec.innerHTML = `<div class="cl-list"></div>`;
      root.appendChild(sec);

      const listEl = sec.querySelector('.cl-list');
      if (!listEl) return;

      entries.forEach((item) => {
        if (!item) return;
        const wrap = document.createElement('article');
        wrap.className = 'cl-entry';

        const ver = item.version || '';
        const date = item.date || '';

        const header = document.createElement('h3');
        header.innerHTML = `v${ver} <span class="cl-date">${date}</span>`;
        wrap.appendChild(header);

        const notes = Array.isArray(item.notes) ? item.notes : [];
        if (notes.length) {
          const ul = document.createElement('ul');
          notes.forEach((n) => {
            const li = document.createElement('li');
            li.textContent = n;
            ul.appendChild(li);
          });
          wrap.appendChild(ul);
        }

        listEl.appendChild(wrap);
      });
    });
  }

  function init() {
    const target = document.getElementById('ftr-changelog');
    if (!target) return;

    fetch(VERSION_URL, { cache: 'no-store' })
      .then((res) => res.text())
      .then((text) => {
        const data = parseJSONLoose(text);
        if (!data) return;

        const entries = Array.isArray(data) ? data : data.entries || [];
        if (!entries.length) return;

        const latest = entries[0];
        const v = latest.version || '0.0.0';

        target.textContent = `v${v} • Changelog`;
        target.style.cursor = 'pointer';

        target.addEventListener('click', function (e) {
          e.preventDefault();
          renderChangelogScreen(entries);
        });
      })
      .catch((err) => {
        console.warn('[changelog] No se pudo leer version.json:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
