// header.messages.js – fachada para mostrar mensajes de sistema en el header
// Usa el banner existente de NotificationsUI (system.notifications.ui.js)
window.HeaderMessages = (function () {
  function show(message, options) {
    options = options || {};
    if (
      window.NotificationsUI &&
      typeof window.NotificationsUI.show === "function"
    ) {
      window.NotificationsUI.show(message, options);
      return;
    }

    // Fallback: si no existe NotificationsUI, escribe en consola
    try {
      console.log("[HeaderMessages]", message);
    } catch (e) {}
  }

  function hide() {
    if (
      window.NotificationsUI &&
      typeof window.NotificationsUI.hide === "function"
    ) {
      window.NotificationsUI.hide();
    }
  }

  // Versión que además intenta guardar la notificación en la tabla,
  // delegando en NotificationsUI.push. En muchos casos no necesitaremos
  // persistirla y bastará con show().
  function push(message, type) {
    if (
      window.NotificationsUI &&
      typeof window.NotificationsUI.push === "function"
    ) {
      window.NotificationsUI.push(message, type);
    } else {
      show(message);
    }
  }

  return {
    show: show,
    hide: hide,
    push: push,
  };
})();
