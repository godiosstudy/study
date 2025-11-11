(function(){
  const bus = window;
  const navList = document.getElementById('nav-list');
  const results = document.getElementById('results-list');
  const focus = document.getElementById('focus-view');

  const DATA = Array.from({length: 10}).map((_,i)=>({
    ref: `Génesis 1:${i+1}`,
    text: i===0 ? 'En el principio creó Dios los cielos y la tierra.' : `Verso de ejemplo ${i+1}…`
  }));

  let context = { path: ['Biblia','AT','Génesis','1'] };

  function renderNav(){
    navList.innerHTML = '';
    DATA.forEach((v,idx)=>{
      const li = document.createElement('li');
      li.textContent = `Versículo ${idx+1}`;
      li.onclick = ()=> selectVerse(idx);
      navList.appendChild(li);
    });
  }

  function renderResults(items){
    results.innerHTML = '';
    items.forEach((v,idx)=>{
      const div = document.createElement('div');
      div.className = 'verse';
      div.innerHTML = `<span class="badge">${v.ref}</span> ${v.text}`;
      div.onclick = ()=> selectVerse(idx);
      results.appendChild(div);
    });
  }

  function renderFocus(v){
    focus.innerHTML = `<h2 style="margin:0 0 6px">${v.ref}</h2><p>${v.text}</p>`;
  }

  function selectVerse(idx){
    const v = DATA[idx];
    renderFocus(v);
    bus.dispatchEvent(new CustomEvent('app:context', { detail: { path: [...context.path, String(idx+1)] } }));
  }

  bus.addEventListener('app:search', async (e)=>{
    const q = (e.detail.q || '').toLowerCase();
    bus.dispatchEvent(new Event('app:loading:start'));
    await new Promise(r=>setTimeout(r, 300));
    const found = q ? DATA.filter(v => (v.text.toLowerCase().includes(q) || v.ref.toLowerCase().includes(q))) : DATA;
    renderResults(found);
    bus.dispatchEvent(new Event('app:loading:end'));
  });

  bus.addEventListener('app:navigate', (e)=>{
    context.path = e.detail.path || context.path;
    bus.dispatchEvent(new CustomEvent('app:context', { detail: { path: context.path } }));
  });

  function handlePrefs(p){
    const path = [p.collection || '—', p.corpus || '—'];
    bus.dispatchEvent(new CustomEvent('app:context', { detail: { path } }));
  }
  window.addEventListener('prefs:applied', (e)=> handlePrefs(e.detail));
  window.addEventListener('prefs:changed', (e)=> handlePrefs(e.detail));

  renderNav();
  renderResults(DATA);
  selectVerse(0);
  bus.dispatchEvent(new CustomEvent('app:context', { detail: { path: context.path } }));

  window.App = window.App || {};
  window.App.Main = { renderNav, renderResults, renderFocus };
})();