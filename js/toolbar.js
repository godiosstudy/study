(function(){
  const bus = window;
  const crumb = document.getElementById('tbar-breadcrumb');
  const input = document.getElementById('tbar-search');

  function setCrumbs(arr){ crumb.textContent = arr.join(' / '); }

  function render(){
    try {
      const lang = (window.PrefsStore?.load()?.language) || 'es';
      const ph = (window.I18n?.__TR?.[lang]?.toolbar?.search) || 'Buscar';
      if (input) input.setAttribute('placeholder', ph);
    } catch {}
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      bus.dispatchEvent(new CustomEvent('app:search', { detail: { q } }));
    }
  });

  bus.addEventListener('app:context', (e)=> setCrumbs(e.detail.path));

  window.App = window.App || {};
  window.App.Toolbar = { setCrumbs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
  window.addEventListener('prefs:applied', render);
  window.addEventListener('i18n:changed', render);
})();