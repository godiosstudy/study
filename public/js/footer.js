;(function(){
  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function loadScriptOnce(src){
    return new Promise((resolve, reject)=>{
      if (document.querySelector('script[data-src="'+src+'"]')) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.dataset.src = src;
      s.onload = ()=> resolve();
      s.onerror = ()=> reject(new Error('Failed to load '+src));
      document.head.appendChild(s);
    });
  }

  function ensureCssOnce(href){
    if (document.querySelector('link[data-href="'+href+'"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.dataset.href = href;
    document.head.appendChild(l);
  }

  onReady(async function(){
    try {
      // CSS del changelog (ruta correcta)
      ensureCssOnce('/public/css/changelog.css');

      // JS del changelog y del logo (rutas correctas)
      if (!window.Changelog) await loadScriptOnce('/public/js/changelog.js');
      if (!window.FooterLogo) await loadScriptOnce('/public/js/logo.js');

      // Inicializar módulos
      window.Changelog && window.Changelog.init({
        targetId: 'ftr-changelog',
        versionUrl: 'version.json'
      });
      window.FooterLogo && window.FooterLogo.init({
        imgId: 'ftr-logo',
        alt: 'Logo',
        title: 'Study.GODiOS'
      });
    } catch (e){
      console.error(e);
    }
  });
})();
