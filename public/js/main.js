// public/js/main.js
;(function () {
  const mainEl = document.getElementById('app-main');
  const viewTitleEl = document.getElementById('view-title');

  if (!mainEl) {
    console.warn('[AppMain] No se encontró #app-main');
    return;
  }

  // ---------- helpers: idioma / traducciones ----------
  function getPrefsLang() {
    const store = window.PrefsStore;
    const loaded = store && store.load && store.load();
    return (loaded && loaded.language) ||
      (store && store.DEFAULTS && store.DEFAULTS.language) ||
      'es';
  }

  function getTR(lang) {
    const base = window.I18n && window.I18n.__TR;
    return base ? base[lang] : null;
  }

  // ---------- solapa de título ----------
  function setViewTitle(label) {
    if (!viewTitleEl) return;
    const text = label || '';
    if (!text) {
      viewTitleEl.textContent = '';
      viewTitleEl.style.display = 'none';
    } else {
      viewTitleEl.textContent = text;
      viewTitleEl.classList.add('view-title-pill');
      viewTitleEl.style.display = 'inline-block';
    }
  }

  // Hacemos este helper visible desde otros módulos
  function externalSetViewTitle(label) {
    setViewTitle(label);
  }

  function getWelcomeCopy() {
    const lang = getPrefsLang();
    const tr = getTR(lang);

    let title = lang === 'es' ? 'Bienvenido a Estudio' : 'Welcome to Study';
    let subtitle =
      lang === 'es'
        ? 'Selecciona una colección o usa el buscador para comenzar.'
        : 'Select a collection or use the search box to start.';

    if (tr && tr.home) {
      if (tr.home.welcomeTitle) title = tr.home.welcomeTitle;
      if (tr.home.welcomeSubtitle) subtitle = tr.home.welcomeSubtitle;
    }

    return { lang, title, subtitle };
  }

  // ---------- helpers de render ----------
  function clearMain() {
    mainEl.innerHTML = '';
    mainEl.className = '';
  }

  function renderScreen(renderer) {
    clearMain();
    const wrapper = document.createElement('div');
    wrapper.className = 'container main-wrap main-screen';
    mainEl.appendChild(wrapper);
    if (typeof renderer === 'function') renderer(wrapper);
  }

  // ---------- vistas ----------
  // 1. Bienvenida (Inicio)
  function showWelcomeView() {
    const { title, subtitle } = getWelcomeCopy();
    setViewTitle(title); // la solapa dice "Bienvenido a Estudio" / "Welcome to Study"

    renderScreen(function (root) {
      const box = document.createElement('section');
      box.className = 'panel panel-single main-welcome';
      box.innerHTML = `
        <div class="main-welcome-inner">
          <p class="main-subtitle">${subtitle}</p>
        </div>
      `;
      root.appendChild(box);
    });
  }

  // 2. Layout de Estudio (NAV / RESULTADOS / FOCUS)
  function showStudyLayout() {
    const lang = getPrefsLang();
    const tr = getTR(lang);
    const label =
      (tr && tr.main && tr.main.studyTitle) ||
      (lang === 'es' ? 'Estudio' : 'Study');

    setViewTitle(label);

    clearMain();
    mainEl.innerHTML = `
      <div class="container main-wrap main-layout-study">
        <div class="grid">
          <section class="panel" id="nav-panel">
            <h3>Navegación</h3>
            <ul id="nav-list" class="list"></ul>
          </section>
          <section class="panel" id="results-panel">
            <h3>Resultados</h3>
            <div id="results-list"></div>
          </section>
          <section class="panel" id="focus-panel">
            <h3>Focus</h3>
            <article id="focus-view"></article>
          </section>
        </div>
      </div>
    `;
    // Más adelante: cuando el usuario elija algo, NAV podrá llamar:
    // AppMain.setViewTitle("Génesis 1") -> level_4 + level_5
  }

  // 3. Resultados de búsqueda
  function showSearchResultsView(results) {
    const lang = getPrefsLang();
    const label =
      lang === 'es' ? 'Resultado de búsqueda' : 'Search results';
    setViewTitle(label);

    renderScreen(function (root) {
      const sec = document.createElement('section');
      sec.className = 'panel panel-single';
      sec.innerHTML = `
        <div id="search-results"></div>
      `;
      root.appendChild(sec);

      const list = sec.querySelector('#search-results');
      if (!list) return;

      if (!results || !results.length) {
        list.textContent = lang === 'es' ? 'No hay resultados.' : 'No results.';
        return;
      }

      const ul = document.createElement('ul');
      ul.className = 'list';
      results.forEach((r) => {
        const li = document.createElement('li');
        li.textContent = r.title || String(r);
        ul.appendChild(li);
      });
      list.appendChild(ul);
    });
  }

  // 4. Vista de Focus (texto puntual)
  // Más adelante podemos llamar AppMain.setViewTitle("Génesis 1:1")
  function showFocusView(data, label) {
    if (label) {
      setViewTitle(label);         // p.ej. "Génesis 1:1" (level_6 + level_7)
    } else {
      const lang = getPrefsLang();
      setViewTitle(lang === 'es' ? 'Focus' : 'Focus');
    }

    renderScreen(function (root) {
      const sec = document.createElement('section');
      sec.className = 'panel panel-single';
      sec.innerHTML = `<article id="focus-view"></article>`;
      root.appendChild(sec);

      const art = sec.querySelector('#focus-view');
      if (!art) return;

      if (!data) {
        art.textContent =
          getPrefsLang() === 'es'
            ? 'No hay contenido para mostrar.'
            : 'No content to display.';
      } else if (typeof data === 'string') {
        art.textContent = data;
      } else if (data.html) {
        art.innerHTML = data.html;
      } else if (data.text) {
        art.textContent = data.text;
      } else {
        art.textContent = JSON.stringify(data, null, 2);
      }
    });
  }

  // ---------- API global ----------
  window.AppMain = {
    clear: clearMain,
    renderScreen,
    showWelcomeView,
    showStudyLayout,
    showSearchResultsView,
    showFocusView,
    setViewTitle: externalSetViewTitle, // para que otros módulos pongan "Preferencias", "Cuenta", "Génesis 1", etc.
  };

  // Inicio: pantalla de bienvenida
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.AppMain.showWelcomeView);
  } else {
    window.AppMain.showWelcomeView();
  }
})();
