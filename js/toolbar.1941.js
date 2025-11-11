(function(){
  const bus = window;
  const crumb = document.getElementById('tbar-breadcrumb');
  const input = document.getElementById('tbar-search');

  function setCrumbs(arr){ crumb.textContent = arr.join(' / '); }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      bus.dispatchEvent(new CustomEvent('app:search', { detail: { q } }));
    }
  });

  bus.addEventListener('app:context', (e)=> setCrumbs(e.detail.path));

  window.App = window.App || {};
  window.App.Toolbar = { setCrumbs };
})();