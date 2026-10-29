/* TeamFlow Admin interactions: theme, responsive navigation and command palette. */
(function () {
  "use strict";

  var THEME_KEY = "tf_admin_theme";
  var COLLAPSE_KEY = "tf_sidebar_collapsed";
  var html = document.documentElement;

  function setTheme(theme) {
    var value = theme === "dark" ? "dark" : "light";
    html.setAttribute("data-theme", value);
    localStorage.setItem(THEME_KEY, value);
    var toggle = document.getElementById("tf-theme-btn");
    if (toggle) toggle.setAttribute("aria-pressed", value === "dark" ? "true" : "false");
  }

  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (!saved && window.matchMedia) saved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(saved || "light");
    var toggle = document.getElementById("tf-theme-btn");
    if (toggle) toggle.addEventListener("click", function () { setTheme(html.getAttribute("data-theme") === "dark" ? "light" : "dark"); });
  }

  function initSidebar() {
    var sidebar = document.getElementById("nav-sidebar");
    var collapse = document.getElementById("tf-toggle-collapse");
    var mobile = document.getElementById("tf-mobile-sidebar-toggle");
    var legacy = document.getElementById("toggle-nav-sidebar");
    var backdrop = document.getElementById("tf-sidebar-backdrop");
    if (!sidebar) return;

    var collapsed = localStorage.getItem(COLLAPSE_KEY) === "1";
    if (collapsed && window.innerWidth > 900) { sidebar.classList.add("is-collapsed"); document.body.classList.add("tf-sidebar-is-collapsed"); }

    function setExpanded(value) {
      if (mobile) mobile.setAttribute("aria-expanded", value ? "true" : "false");
      if (legacy) legacy.setAttribute("aria-expanded", value ? "true" : "false");
    }
    function closeMobile() { sidebar.classList.remove("is-mobile-open"); if (backdrop) backdrop.hidden = true; document.body.classList.remove("tf-mobile-locked"); setExpanded(false); }
    function openMobile() { sidebar.classList.add("is-mobile-open"); if (backdrop) backdrop.hidden = false; document.body.classList.add("tf-mobile-locked"); setExpanded(true); }

    if (collapse) collapse.addEventListener("click", function () {
      var next = !document.body.classList.contains("tf-sidebar-is-collapsed");
      document.body.classList.toggle("tf-sidebar-is-collapsed", next);
      sidebar.classList.toggle("is-collapsed", next);
      collapse.setAttribute("aria-pressed", next ? "true" : "false");
      collapse.textContent = next ? "›" : "‹";
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    });
    if (mobile) mobile.addEventListener("click", openMobile);
    if (legacy) legacy.addEventListener("click", function (event) { event.preventDefault(); sidebar.classList.contains("is-mobile-open") ? closeMobile() : openMobile(); });
    if (backdrop) backdrop.addEventListener("click", closeMobile);
    sidebar.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", function () { if (window.innerWidth <= 900) closeMobile(); }); });
    window.addEventListener("resize", function () { if (window.innerWidth > 900) closeMobile(); });
  }

  function initPalette() {
    var backdrop = document.getElementById("tf-palette-backdrop");
    var input = document.getElementById("tf-palette-input");
    var topInput = document.getElementById("tf-top-search-input");
    var close = document.getElementById("tf-palette-close");
    var lastFocus = null;
    if (!backdrop) return;

    function open() { lastFocus = document.activeElement; backdrop.hidden = false; window.setTimeout(function () { if (input) input.focus(); }, 20); }
    function hide() { backdrop.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    window.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); backdrop.hidden ? open() : hide(); }
      if (event.key === "Escape" && !backdrop.hidden) hide();
    });
    if (topInput) topInput.addEventListener("focus", function (event) { if (window.innerWidth > 680) { event.preventDefault(); open(); } });
    if (close) close.addEventListener("click", hide);
    backdrop.addEventListener("click", function (event) { if (event.target === backdrop) hide(); });
    var form = document.getElementById("tf-palette-form");
    if (form) form.addEventListener("submit", function (event) { if (input && input.value.trim().length < 2) { event.preventDefault(); input.focus(); } });
  }

  function initMessages() {
    document.querySelectorAll(".messagelist li").forEach(function (item) {
      item.setAttribute("role", "status");
      item.addEventListener("click", function () { item.classList.add("tf-message-dismissed"); window.setTimeout(function () { item.remove(); }, 180); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () { initTheme(); initSidebar(); initPalette(); initMessages(); });
})();
