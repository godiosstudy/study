(function(){
  const bus = window;
  const el = document.getElementById('app-loader');
  function show(){ el.style.display = 'block'; }
  function hide(){ el.style.display = 'none'; }
  bus.addEventListener('app:loading:start', show);
  bus.addEventListener('app:loading:end', hide);
  window.App = window.App || {};
  window.App.Loader = { show, hide };
})();