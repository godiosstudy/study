;(function(){
  // Minimal login modal (demo). Replace with real auth later.
  function open(setUser){
    const email = prompt('Email');
    if (!email) return;
    const name = email.split('@')[0];
    setUser({ id: crypto.randomUUID(), email, first_name: name });
    alert('¡Bienvenido!');
  }
  window.UsersLogin = { open };
})();