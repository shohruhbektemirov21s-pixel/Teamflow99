import { LogOut, Moon, Sparkles, Sun, User, Users } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

import { T } from "@/shared/text";
import { Avatar } from "@/shared/ui";

import { useAuth, useMe } from "./auth";
import { useTheme } from "./Layout";
import { ModalHost } from "./modals";

/** Oddiy foydalanuvchi: telefonda pastda, kompyuterda tepada ikki bo'lim (Dasturchilar · Profil). */
export default function UserLayout() {
  const me = useMe();
  const { logout } = useAuth();
  const [theme, toggleTheme] = useTheme();

  return (
    <div className="ulayout">
      <a className="skip-link" href="#main-content">{T.nav.skipContent}</a>
      <header className="ubar">
        <span className="ubar-brand"><Sparkles size={20} aria-hidden /> {T.app}</span>
        <nav className="utabs" aria-label={T.user.menu}>
          <NavLink to="/" end className="utab"><Users size={22} aria-hidden /><span>{T.user.tabDevelopers}</span></NavLink>
          <NavLink to="/profil" className="utab"><User size={22} aria-hidden /><span>{T.user.tabProfile}</span></NavLink>
        </nav>
        <Link to="/profil" className="ubar-me" aria-label={T.user.profileLink} title={T.user.profileLink}><Avatar user={me} /></Link>
        <button type="button" className="btn btn-ghost" onClick={toggleTheme} aria-label={T.nav.theme} title={T.nav.theme}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          <LogOut size={16} /> {T.nav.logout}
        </button>
      </header>
      <main id="main-content" className="umain" tabIndex={-1}>
        <Outlet />
      </main>
      <ModalHost />
    </div>
  );
}
