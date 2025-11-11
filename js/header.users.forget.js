;(function(){
  function open(){
    const email = prompt('Escribe tu email para recuperar contraseña');
    if (!email) return;
    alert('Si existe una cuenta, te enviaremos instrucciones.');
  }
  window.UsersForget = { open };
})();