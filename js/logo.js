;(function(){
  function init(opts){
    const imgId = (opts && opts.imgId) || 'ftr-logo';
    const el = document.getElementById(imgId);
    if (!el) return;
    if (opts && opts.alt) el.alt = opts.alt;
    if (opts && opts.title) el.title = opts.title;
    // src se define en el HTML: <img id="ftr-logo" src="img/logo.png">
  }
  window.FooterLogo = { init };
})();