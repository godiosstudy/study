;(function(){
  function open(setUser){
    const email = prompt('Email para registrarte');
    if (!email) return;
    const name = prompt('Tu nombre') || email.split('@')[0];
    setUser({ id: crypto.randomUUID(), email, first_name: name, isNew: true });
    alert('Cuenta creada.');
  }
  window.UsersRegister = { open };
})();