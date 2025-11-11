;(function(){
  function run(setUser){
    const ok = confirm('¿Cerrar sesión?');
    if (ok){ setUser(null); }
  }
  window.UsersSignOut = { run };
})();