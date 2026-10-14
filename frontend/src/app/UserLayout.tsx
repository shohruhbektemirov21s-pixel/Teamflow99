import { LogOut, Moon, Sparkles, Star, Sun, User, Users } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

import { T } from "@/shared/text";
import { Avatar } from "@/shared/ui";

import { useAuth, useMe } from "./auth";
import { useTheme } from "./Layout";
import { ModalHost } from "./modals";

/** Oddiy foydalanuvchi: tepada panel, kompyuterda chap menyu, telefonda pastki menyu (Dasturchilar · Mening baholarim · Profil). */
export default function UserLayout() {
  const me = useMe();
  const { logout } = useAuth();
  const [theme, toggleTheme] = useTheme();

  return (
    <div className="ushell">
      <a className="skip-link" href="#main-content">{T.nav.skipContent}</a>
      <header className="ubar">
        <Link to="/" className="ubar-brand">
          <span className="brand-mark" style={{ width: 34, height: 34, borderRadius: 10 }}>
            <Sparkles size={17} aria-hidden />
          </span>
          <span className="brand-copy" style={{ lineHeight: 1.15 }}>
            <strong style={{ fontSize: "16px", fontWeight: 760, letterSpacing: "-.025em" }}>{T.app}</strong>
            <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 600 }}>{T.user.roleLabel}</span>
          </span>
        </Link>
        <span className="grow" />
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={T.nav.theme} title={T.nav.theme} aria-pressed={theme === "dark"}>
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <Link to="/profil" className="ubar-me" aria-label={T.user.userMenu}>
          <Avatar user={me} size="sm" card={false} />
          <span className="ubar-name ellipsis">{me.first_name || me.full_name}</span>
        </Link>
        <button type="button" className="icon-btn" onClick={logout} aria-label={T.nav.logout} title={T.nav.logout}>
          <LogOut size={16} />
        </button>
      </header>
      <div className="ubody">
        <nav className="utabs" aria-label={T.user.menu}>
          <NavLink to="/" end className="utab"><Users size={18} aria-hidden /><span>{T.user.navDevelopers}</span></NavLink>
          <NavLink to="/baholarim" className="utab"><Star size={18} aria-hidden /><span>{T.user.navReviews}</span></NavLink>
          <NavLink to="/profil" className="utab"><User size={18} aria-hidden /><span>{T.user.navProfile}</span></NavLink>
        </nav>
        <main id="main-content" className="umain" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <ModalHost />
    </div>
  );
}
