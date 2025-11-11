;(function(){
  const TR = {
    en: {
      domain: { title: "Studio.GODiOS.org" },
      toolbar: { search: "Search" },
      buttons: {
        signIn: "Login",
        register: "Register",
        preferences: "Preferences",
        myAccount: "My account",
        logout: "Log out"
      },
      users: {
        login: { title: "Sign in" },
        forget: { title: "Forget Password" },
        account: { title: "Account" },
        signout: { title: "Log out", confirm: "Do you want to log out?" }
      },
      prefs: {
        title: "Preferences",
        labels: {
          language: "Language",
          collection: "Collection",
          corpus: "Corpus",
          fontType: "Font Type",
          fontSize: "Font Size",
          light: "Light",
          colorAccent: "Color (accent)"
        },
        actions: {
          cancel: "Cancel",
          save: "Save",
          close: "Close"
        },
        light: {
          on: "On",
          off: "Off"
        }
      }
    },
    es: {
      domain: { title: "Estudio.GODiOS.org" },
      toolbar: { search: "Buscar" },
      buttons: {
        signIn: "Iniciar Sesión",
        register: "Registrarse",
        preferences: "Preferencias",
        myAccount: "Mi cuenta",
        logout: "Cerrar sesión"
      },
      users: {
        login: { title: "Iniciar Sesión" },
        forget: { title: "Olvidé mi contraseña" },
        account: { title: "Mi cuenta" },
        signout: { title: "Cerrar sesión", confirm: "¿Cerrar sesión?" }
      },
      prefs: {
        title: "Preferencias",
        labels: {
          language: "Idioma",
          collection: "Colección",
          corpus: "Corpus",
          fontType: "Tipo de Fuente",
          fontSize: "Tamaño de Fuente",
          light: "Luz",
          colorAccent: "Color (acento)"
        },
        actions: {
          cancel: "Cancelar",
          save: "Guardar",
          close: "Cerrar"
        },
        light: {
          on: "Encendido",
          off: "Apagado"
        }
      }
    }
  };

  window.I18n = window.I18n || {};
  window.I18n.__TR = TR;
})();