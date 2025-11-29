// system.permissions.js – carga y chequeo de permisos por usuario (roles + módulos)
(function () {
  var UserPermissions = {
    loaded: false,
    roles: [],
    modules: {}, // modules[module] = { can_view, can_create, can_edit, can_delete, can_manage }

    reset: function () {
      this.loaded = false;
      this.roles = [];
      this.modules = {};
    },

    async load() {
      this.reset();

      try {
        if (
          !window.BackendSupabase ||
          typeof window.BackendSupabase.client !== "function" ||
          typeof window.BackendSupabase.isConfigured !== "function" ||
          !window.BackendSupabase.isConfigured()
        ) {
          console.warn("[UserPermissions] Supabase no configurado");
          return this.modules;
        }

        var client = window.BackendSupabase.client();
        if (!client) return this.modules;

        var user =
          window.AuthSession && typeof window.AuthSession.getUser === "function"
            ? window.AuthSession.getUser()
            : null;
        if (!user || !user.id) return this.modules;

        // Roles del usuario
        var roleRes = await client
          .from("user_roles")
          .select("role_id")
          .eq("user_id", user.id);

        if (roleRes && roleRes.error) {
          console.error("[UserPermissions] error leyendo user_roles", roleRes.error);
          return this.modules;
        }

        var roleIds =
          (roleRes && roleRes.data ? roleRes.data.map(function (r) { return r.role_id; }) : []) || [];
        this.roles = roleIds;

        if (!roleIds.length) {
          this.loaded = true;
          return this.modules;
        }

        // Permisos por rol/módulo
        var permRes = await client
          .from("role_module_permissions")
          .select("module, can_view, can_create, can_edit, can_delete, can_manage")
          .in("role_id", roleIds);

        if (permRes && permRes.error) {
          console.error("[UserPermissions] error leyendo role_module_permissions", permRes.error);
          return this.modules;
        }

        var rows = (permRes && permRes.data) || [];
        var modules = {};

        rows.forEach(function (row) {
          var mod = String(row.module || "").trim();
          if (!mod) return;
          var current = modules[mod] || {
            can_view: false,
            can_create: false,
            can_edit: false,
            can_delete: false,
            can_manage: false,
          };

          current.can_view = current.can_view || !!row.can_view;
          current.can_create = current.can_create || !!row.can_create;
          current.can_edit = current.can_edit || !!row.can_edit;
          current.can_delete = current.can_delete || !!row.can_delete;
          current.can_manage = current.can_manage || !!row.can_manage;

          modules[mod] = current;
        });

        this.modules = modules;
        this.loaded = true;
      } catch (e) {
        console.error("[UserPermissions] load exception", e);
      }

      return this.modules;
    },

    can: function (module, action) {
      if (!module || !action) return false;
      var mod = this.modules[module];
      if (!mod) return false;
      var key = "can_" + String(action).toLowerCase();
      return !!mod[key];
    },

    getModule: function (module) {
      if (!module) return null;
      return this.modules[module] || null;
    },
  };

  window.UserPermissions = UserPermissions;

  // Ejemplos:
  // if (UserPermissions.can('users', 'manage')) { ... }
  // if (UserPermissions.can('entries_seo', 'edit')) { ... }
})();
