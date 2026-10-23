(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const sidebar = document.getElementById("nav-sidebar");
  const mobileToggle = document.getElementById("toggle-nav-sidebar");
  const collapseToggle = document.getElementById("tf-toggle-collapse");
  const backdrop = document.getElementById("tf-sidebar-backdrop");
  const themeToggle = document.getElementById("tf-theme-btn");
  const desktopBreakpoint = window.matchMedia("(min-width: 861px)");

  const setMobileOpen = (open) => {
    if (!sidebar || !mobileToggle || !backdrop) return;
    sidebar.classList.toggle("is-open", open);
    body.classList.toggle("tf-mobile-nav-open", open);
    mobileToggle.setAttribute("aria-expanded", String(open));
    backdrop.hidden = !open;
  };

  mobileToggle?.addEventListener("click", () => {
    setMobileOpen(!sidebar?.classList.contains("is-open"));
  });
  backdrop?.addEventListener("click", () => setMobileOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMobileOpen(false);
  });

  desktopBreakpoint.addEventListener("change", (event) => {
    if (event.matches) setMobileOpen(false);
  });

  const collapsed = localStorage.getItem("teamflow-admin-sidebar") === "collapsed";
  body.classList.toggle("tf-sidebar-collapsed", collapsed);
  collapseToggle?.setAttribute("aria-pressed", String(collapsed));
  collapseToggle?.addEventListener("click", () => {
    const next = !body.classList.contains("tf-sidebar-collapsed");
    body.classList.toggle("tf-sidebar-collapsed", next);
    collapseToggle.setAttribute("aria-pressed", String(next));
    localStorage.setItem("teamflow-admin-sidebar", next ? "collapsed" : "expanded");
  });

  const savedTheme = localStorage.getItem("teamflow-admin-theme");
  if (savedTheme === "dark" || savedTheme === "light") {
    root.dataset.theme = savedTheme;
  }
  themeToggle?.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
  themeToggle?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    themeToggle.setAttribute("aria-pressed", String(next === "dark"));
    localStorage.setItem("teamflow-admin-theme", next);
  });
})();
