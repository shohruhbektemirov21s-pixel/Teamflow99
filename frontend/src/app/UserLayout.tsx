import { LogOut, Moon, Sparkles, Sun, User, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { T } from "@/shared/text";

import { useAuth } from "./auth";
import { useTheme } from "./Layout";
import { ModalHost } from "./modals";

/** Oddiy foydalanuvchi: yuqorida nom va chiqish, pastda ikki bo'lim (Dasturchilar · Profil). */
export default function UserLayout() {
  const { logout } = useAuth();
  const [theme, toggleTheme] = useTheme();

  return (
    <div className="ulayout">
      <a className="skip-link" href="#main-content">{T.nav.skipContent}</a>
      <header className="ubar">
        <span className="ubar-brand"><Sparkles size={20} aria-hidden /> {T.app}</span>
        <button type="button" className="btn btn-ghost" onClick={toggleTheme} aria-label={T.nav.theme}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          <LogOut size={16} /> {T.nav.logout}
        </button>
      </header>
      <main id="main-content" className="umain" tabIndex={-1}>
        <Outlet />
      </main>
      <nav className="utabs" aria-label={T.user.menu}>
        <NavLink to="/" end className="utab"><Users size={22} aria-hidden /><span>{T.user.tabDevelopers}</span></NavLink>
        <NavLink to="/profil" className="utab"><User size={22} aria-hidden /><span>{T.user.tabProfile}</span></NavLink>
      </nav>
      <ModalHost />
    </div>
  );
}
