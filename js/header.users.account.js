;(function(){
  function open(user){
    alert('Mi cuenta\n' + JSON.stringify(user, null, 2));
  }
  window.UsersAccount = { open };
})();