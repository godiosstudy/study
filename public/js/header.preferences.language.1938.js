;(function(){
  const LANGS = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
  ];
  function mountLanguageSelect(selectEl, current){
    selectEl.innerHTML = '';
    LANGS.forEach(({code, label})=>{
      const opt = document.createElement('option');
      opt.value = code; opt.textContent = label;
      if (code === current) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }
  window.LanguagePrefs = { LANGS, mountLanguageSelect };
})();