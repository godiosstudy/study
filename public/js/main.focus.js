// main.focus.js – panel de contenido enfocado
window.MainFocus = (function () {
  function getPrefs() {
    try {
      if (window.PrefsStore && typeof window.PrefsStore.load === "function") {
        return window.PrefsStore.load() || {};
      }
    } catch (e) {}
    return {};
  }

  function getLang() {
    var prefs = getPrefs();
    return prefs.language || "es";
  }


  function render(container, options) {
    if (!container) return;

    var body = container;
    var lang = getLang();
    var prefs = getPrefs();
    var opts = options || {};

    var l1 = opts.level_1 || null;
    var l2 = opts.level_2 || null;
    var l3 = opts.level_3 || null;
    var l4 = opts.level_4 || "";
    var l5 = opts.level_5 || "";
    var l6 = opts.level_6 || "";
    var l7 = opts.level_7 || "";

    // 🔁 Preparar navegación anterior/siguiente dentro del mismo capítulo
    var prevRow = null;
    var nextRow = null;

    try {
      if (window.EntriesMemory && typeof window.EntriesMemory.getRows === "function") {
        var allRows = window.EntriesMemory.getRows() || [];
        if (allRows && allRows.length) {
          var langCode = prefs.language || "es";

          var sameChapter = [];
          for (var i = 0; i < allRows.length; i++) {
            var row = allRows[i];
            if (!row) continue;

            if (row.language_code && langCode && row.language_code !== langCode) continue;
            if (l1 && row.level_1 !== l1) continue;
            if (l2 && row.level_2 !== l2) continue;
            if (l3 && row.level_3 !== l3) continue;
            if (l4 && row.level_4 !== l4) continue;
            if (l5 && row.level_5 !== l5) continue;
            if (!row.level_6) continue;

            sameChapter.push(row);
          }

          if (sameChapter.length) {
            sameChapter.sort(function (a, b) {
              var n1 = parseInt(a.level_6, 10);
              var n2 = parseInt(b.level_6, 10);
              var bothNumeric = !isNaN(n1) && !isNaN(n2);
              if (bothNumeric && n1 !== n2) return n1 - n2;

              var o1 = typeof a.entry_order === "number" ? a.entry_order : Number.MAX_SAFE_INTEGER;
              var o2 = typeof b.entry_order === "number" ? b.entry_order : Number.MAX_SAFE_INTEGER;
              if (o1 !== o2) return o1 - o2;

              var s1 = String(a.level_6 || "");
              var s2 = String(b.level_6 || "");
              if (s1 < s2) return -1;
              if (s1 > s2) return 1;
              return 0;
            });

            var idx = -1;
            var curL6 = String(l6 || "");
            for (var j = 0; j < sameChapter.length; j++) {
              if (String(sameChapter[j].level_6 || "") === curL6) {
                idx = j;
                break;
              }
            }

            if (idx >= 0) {
              if (idx > 0) prevRow = sameChapter[idx - 1];
              if (idx < sameChapter.length - 1) nextRow = sameChapter[idx + 1];
            }
          }
        }
      }
    } catch (eNav) {
      console.warn("[MainFocus] error calculando versículo anterior/siguiente", eNav);
    }

    // 🔁 Sincronizar breadcrumb con el foco actual ANTES de pintar el contenido
    try {
      if (window.Toolbar && typeof window.Toolbar.setFromFocus === "function") {
        window.Toolbar.setFromFocus(l3, l4, l5);
      } else if (window.ToolbarState) {
        window.ToolbarState.level_3 = l3 || window.ToolbarState.level_3 || "";
        window.ToolbarState.level_4 = l4 || window.ToolbarState.level_4 || "";
        window.ToolbarState.level_5 = l5 || window.ToolbarState.level_5 || "";
      }

    } catch (e) {}

    // Limpiar contenedor
    body.innerHTML = "";

    // Encabezado principal dentro del main (sin solapa invertida)
    var header = document.createElement("div");
    header.className = "main-view-header";

    var h1 = document.createElement("h1");
    h1.className = "main-view-title";

    if (l4 && l5 && l6) {
      h1.textContent = l4 + " " + l5 + ": " + l6;
    } else {
      h1.textContent = lang === "en" ? "Focused verse" : "Versículo enfocado";
    }

    header.appendChild(h1);
    body.appendChild(header);

    // Fila principal solo con el versículo en su marco
    var row = document.createElement("div");
    row.className = "focus-main-row";

    // Versículo estrella (nivel 7) dentro de su marco
    var content = document.createElement("div");
    content.className = "focus-main-text";

    if (l7) {
      content.textContent = l7;
    } else {
      content.textContent =
        lang === "en"
          ? "When you click an item in Navigation or Results, its Level 7 will appear here."
          : "Cuando hagas clic en un elemento de Navegación o Resultados, su Nivel 7 aparecerá aquí.";
    }

    row.appendChild(content);
    body.appendChild(row);

    // Botones de flecha integrados en el título (header)
    var prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "focus-nav-btn focus-nav-prev";

    var prevIcon = document.createElement("i");
    prevIcon.setAttribute("data-lucide", "step-back");
    prevBtn.appendChild(prevIcon);

    if (!prevRow) {
      prevBtn.classList.add("is-disabled");
      prevBtn.disabled = true;
    } else {
      prevBtn.title = lang === "en" ? "Previous verse" : "Versículo anterior";
      prevBtn.addEventListener("click", function () {
        if (!prevRow) return;
        if (!window.Main || typeof window.Main.showView !== "function") return;
        window.Main.showView("focus", {
          level_1: prevRow.level_1 || l1,
          level_2: prevRow.level_2 || l2,
          level_3: prevRow.level_3 || l3,
          level_4: prevRow.level_4 || l4,
          level_5: prevRow.level_5 || l5,
          level_6: prevRow.level_6 || "",
          level_7: prevRow.level_7 || ""
        });
      });
    }

    var nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "focus-nav-btn focus-nav-next";

    var nextIcon = document.createElement("i");
    nextIcon.setAttribute("data-lucide", "step-forward");
    nextBtn.appendChild(nextIcon);

    if (!nextRow) {
      nextBtn.classList.add("is-disabled");
      nextBtn.disabled = true;
    } else {
      nextBtn.title = lang === "en" ? "Next verse" : "Versículo siguiente";
      nextBtn.addEventListener("click", function () {
        if (!nextRow) return;
        if (!window.Main || typeof window.Main.showView !== "function") return;
        window.Main.showView("focus", {
          level_1: nextRow.level_1 || l1,
          level_2: nextRow.level_2 || l2,
          level_3: nextRow.level_3 || l3,
          level_4: nextRow.level_4 || l4,
          level_5: nextRow.level_5 || l5,
          level_6: nextRow.level_6 || "",
          level_7: nextRow.level_7 || ""
        });
      });
    }

    // Añadimos las flechas al header para que queden a los lados del título
    header.appendChild(prevBtn);
    header.appendChild(nextBtn);

    // Panel de acciones debajo del versículo (centrado)
    var actions = document.createElement("div");
    actions.className = "focus-actions";

    // Botón BACK principal (usa Lucide arrow-big-left-dash)
    var backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "focus-action-btn";

    var backIcon = document.createElement("i");
    backIcon.setAttribute("data-lucide", "arrow-big-left-dash");
    backBtn.appendChild(backIcon);

    backBtn.title =
      lang === "en" ? "Back to chapter" : "Volver al capítulo completo";

    backBtn.addEventListener("click", function () {
      if (window.Main && typeof window.Main.showView === "function") {
        window.Main.showView("navigator", {
          level_4: l4,
          level_5: l5
        });
      }
    });

    actions.appendChild(backBtn);

    // Acciones extra: views / likes / notes / share (contadores futuros)
    function createStatAction(idBadge, iconName, labelEs, labelEn) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "focus-action-btn";

      var iconEl = document.createElement("i");
      iconEl.setAttribute("data-lucide", iconName);
      btn.appendChild(iconEl);

      var badge = document.createElement("span");
      badge.className = "focus-action-badge";
      badge.id = idBadge;
      badge.textContent = "0";
      btn.appendChild(badge);

      var label = lang === "en" ? (labelEn || "") : (labelEs || "");
      if (label) {
        btn.title = label;
        btn.setAttribute("aria-label", label);
      }

      // TODO: enganchar a Supabase para views/likes/notes/share
      return btn;
    }

    actions.appendChild(
      createStatAction("focus-views", "eye", "Vistas", "Views")
    );
    actions.appendChild(
      createStatAction("focus-likes", "heart-plus", "Likes", "Likes")
    );
    actions.appendChild(
      createStatAction("focus-notes", "notebook-pen", "Notas", "Notes")
    );
    actions.appendChild(
      createStatAction("focus-share", "share-2", "Compartidos", "Shares")
    );

    body.appendChild(actions);

    // Activar Lucide en los iconos recién creados
    try {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
      }
    } catch (eLucide) {}
  }
  return { render: render };
})();
