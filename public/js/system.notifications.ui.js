// system.notifications.ui.js – banner de notificaciones en el header
window.NotificationsUI = (function () {
  var BANNER_ID = "hdr-notification-banner";
  var hideTimeout = null;
  var DEFAULT_DURATION = 7000; // ms

  function getBannerEl() {
    return document.getElementById(BANNER_ID);
  }

  function applyBannerType(el, type) {
    if (!el || !el.classList) return;
    el.classList.remove(
      "header-message--error",
      "header-message--success",
      "header-message--warning"
    );

    var t = String(type || "").toLowerCase();
    if (t === "error") {
      el.classList.add("header-message--error");
    } else if (t === "warning") {
      el.classList.add("header-message--warning");
    } else {
      el.classList.add("header-message--success");
    }
  }

  function show(message, options) {
    options = options || {};
    var el = getBannerEl();
    if (!el) return;

    var text = String(message || "").trim();
    if (!text) return;

    el.textContent = text;
    applyBannerType(el, options.type || options.variant || options.status || null);

    try {
      el.classList.add("hdr-notification-banner--visible");
    } catch (e) {}

    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    var duration = typeof options.duration === "number" ? options.duration : DEFAULT_DURATION;
    if (duration > 0) {
      hideTimeout = setTimeout(hide, duration);
    }
  }

  function hide() {
    var el = getBannerEl();
    if (!el) return;
    try {
      el.classList.remove("hdr-notification-banner--visible");
    } catch (e) {}
  }

  async function push(message, type) {
    var text = String(message || "").trim();
    if (!text) return;

    show(text);

    try {
      if (
        !window.BackendSupabase ||
        typeof window.BackendSupabase.client !== "function" ||
        !window.BackendSupabase.isConfigured ||
        typeof window.BackendSupabase.isConfigured !== "function" ||
        !window.BackendSupabase.isConfigured()
      ) {
        return;
      }

      var client = window.BackendSupabase.client();
      var user = null;

      if (
        window.AuthSession &&
        typeof window.AuthSession.getUser === "function"
      ) {
        user = window.AuthSession.getUser();
      }

      if (!client || !user || !user.id) return;

      var payload = {
        user_id: user.id,
        notification_text: text,
      };
      if (type) {
        payload.type = String(type);
      }

      var res = await client.from("notifications").insert(payload);
      if (res && res.error) {
        console.warn("[NotificationsUI] error insertando notificación", res.error);
      } else {
        try {
          window.dispatchEvent(new Event("auth:changed"));
        } catch (e) {}
      }
    } catch (e) {
      console.warn("[NotificationsUI] excepción insertando notificación", e);
    }
  }

  return {
    show: show,
    hide: hide,
    push: push,
  };
})();
