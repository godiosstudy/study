;(function(){
  function currentLang(){
    try { return (window.PrefsStore && window.PrefsStore.load && window.PrefsStore.load().language) || 'es'; }
    catch { return 'es'; }
  }
  window.App = window.App || {};
  window.App.Profiles = {
    async existsByEmail(email){
      const r = await fetch('/api/exists-by-email?email='+encodeURIComponent(email), { cache: 'no-store' });
      if (!r.ok) throw new Error('exists api failed');
      const j = await r.json(); return !!j.exists;
    },
    async create({ name, email, password }){
      const r = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ name, email, password, lang: currentLang() })
      });
      if (!r.ok) throw new Error('register api failed');
      return await r.json();
    }
  };
  window.App.Mailer = {
    async sendValidation(email, token){ /* server sends email; no-op */ }
  };
})();