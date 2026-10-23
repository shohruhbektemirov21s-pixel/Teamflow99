/**
 * TeamFlow Modern SaaS Admin Engine
 * Handles theme toggling, quick search palette (Ctrl+K), sidebar collapse & responsive drawer.
 */
(function () {
  "use strict";

  // 1. Theme Management
  var STORAGE_THEME_KEY = "tf_admin_theme";
  var htmlEl = document.documentElement;

  function initTheme() {
    var saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (!saved) {
      saved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    applyTheme(saved);
  }

  function applyTheme(theme) {
    htmlEl.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_THEME_KEY, theme);

    var sunIcon = document.querySelector(".tf-icon-sun");
    var moonIcon = document.querySelector(".tf-icon-moon");
    if (sunIcon && moonIcon) {
      if (theme === "dark") {
        sunIcon.style.display = "none";
        moonIcon.style.display = "block";
      } else {
        sunIcon.style.display = "block";
        moonIcon.style.display = "none";
      }
    }
  }

  function toggleTheme() {
    var current = htmlEl.getAttribute("data-theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
  }

  // 2. Sidebar Collapse & Mobile Drawer
  var STORAGE_COLLAPSE_KEY = "tf_sidebar_collapsed";

  function initSidebar() {
    var navSidebar = document.getElementById("nav-sidebar");
    var collapseBtn = document.getElementById("tf-toggle-collapse");
    var mobileToggle = document.getElementById("tf-mobile-sidebar-toggle");
    var backdrop = document.getElementById("tf-sidebar-backdrop");
    var legacyToggle = document.getElementById("toggle-nav-sidebar");

    // Restore desktop collapsed state
    if (navSidebar && localStorage.getItem(STORAGE_COLLAPSE_KEY) === "1") {
      navSidebar.classList.add("is-collapsed");
      document.body.classList.add("tf-sidebar-is-collapsed");
    }

    if (collapseBtn && navSidebar) {
      collapseBtn.addEventListener("click", function () {
        var isCollapsed = navSidebar.classList.toggle("is-collapsed");
        document.body.classList.toggle("tf-sidebar-is-collapsed", isCollapsed);
        localStorage.setItem(STORAGE_COLLAPSE_KEY, isCollapsed ? "1" : "0");
        collapseBtn.textContent = isCollapsed ? "›" : "‹";
      });
    }

    function openMobileDrawer() {
      if (navSidebar) navSidebar.classList.add("is-mobile-open");
      if (backdrop) backdrop.hidden = false;
      document.body.classList.add("tf-mobile-locked");
    }

    function closeMobileDrawer() {
      if (navSidebar) navSidebar.classList.remove("is-mobile-open");
      if (backdrop) backdrop.hidden = true;
      document.body.classList.remove("tf-mobile-locked");
    }

    if (mobileToggle) {
      mobileToggle.addEventListener("click", openMobileDrawer);
    }
    if (legacyToggle) {
      legacyToggle.addEventListener("click", function (e) {
        e.preventDefault();
        if (navSidebar && navSidebar.classList.contains("is-mobile-open")) {
          closeMobileDrawer();
        } else {
          openMobileDrawer();
        }
      });
    }
    if (backdrop) {
      backdrop.addEventListener("click", closeMobileDrawer);
    }
  }

  // 3. Quick Search Palette (Ctrl+K / ⌘K)
  function initSearchPalette() {
    var paletteBackdrop = document.getElementById("tf-palette-backdrop");
    var paletteInput = document.getElementById("tf-palette-input");
    var paletteClose = document.getElementById("tf-palette-close");
    var topSearchInput = document.getElementById("tf-top-search-input");

    function openPalette() {
      if (!paletteBackdrop) return;
      paletteBackdrop.hidden = false;
      if (paletteInput) {
        paletteInput.value = "";
        setTimeout(function () { paletteInput.focus(); }, 50);
      }
    }

    function closePalette() {
      if (!paletteBackdrop) return;
      paletteBackdrop.hidden = true;
    }

    // Keyboard shortcut Ctrl+K or ⌘K
    window.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (paletteBackdrop && !paletteBackdrop.hidden) {
          closePalette();
        } else {
          openPalette();
        }
      }
      if (e.key === "Escape" && paletteBackdrop && !paletteBackdrop.hidden) {
        closePalette();
      }
    });

    if (topSearchInput) {
      topSearchInput.addEventListener("click", function (e) {
        // If clicked on desktop, open palette for richer quick navigation
        if (window.innerWidth > 768) {
          e.preventDefault();
          openPalette();
        }
      });
    }

    if (paletteClose) {
      paletteClose.addEventListener("click", closePalette);
    }

    if (paletteBackdrop) {
      paletteBackdrop.addEventListener("click", function (e) {
        if (e.target === paletteBackdrop) {
          closePalette();
        }
      });
    }

    if (paletteInput) {
      paletteInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && paletteInput.value.trim().length > 0) {
          e.preventDefault();
          window.location.href = "/admin/search/?q=" + encodeURIComponent(paletteInput.value.trim());
        }
      });
    }
  }

  // 4. Auto-dismiss alerts & messages
  function initMessages() {
    var messageItems = document.querySelectorAll(".messagelist li");
    messageItems.forEach(function (item) {
      item.addEventListener("click", function () {
        item.style.opacity = "0";
        setTimeout(function () { item.remove(); }, 200);
      });
    });
  }

  // Document ready execution
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initSidebar();
    initSearchPalette();
    initMessages();

    var themeBtn = document.getElementById("tf-theme-btn");
    if (themeBtn) {
      themeBtn.addEventListener("click", toggleTheme);
    }
  });
})();
