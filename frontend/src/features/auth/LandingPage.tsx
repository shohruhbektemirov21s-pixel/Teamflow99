import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle,
  FileText,
  FolderKanban,
  Laptop,
  Moon,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { T } from "@/shared/text";
import { Button } from "@/shared/ui";

type RoleKey = "department" | "pm" | "developer" | "boss";

interface RoleInfo {
  key: RoleKey;
  label: string;
  icon: ReactNode;
  tagline: string;
  description: string;
  steps: string[];
  highlight: string;
}

const ROLES: RoleInfo[] = [
  {
    key: "department",
    label: "Boshqarma",
    icon: <Building2 size={20} />,
    tagline: "Buyurtmachi va talab qo'yuvchi bo'limlar",
    description: "Qog'ozbozliksiz, to'g'ridan-to'g'ri tizim orqali buyurtma (TZ) yuboring va ijrosini nazorat qiling.",
    steps: [
      "Word (.docx) formatidagi texnik topshiriqni yuklash",
      "Menejer ko'rib chiqishi va tasdiqlashini kuzatish",
      "Loyiha yakunlangach, hisobotni ko'rib qabul qilish",
    ],
    highlight: "Ortiqcha telefon qo'ng'iroqlari va xatlarsiz yagona oyna",
  },
  {
    key: "pm",
    label: "Loyiha menejeri (PM)",
    icon: <FolderKanban size={20} />,
    tagline: "Loyiha va jamoani boshqaruvchi",
    description: "Buyurtmalarni loyihaga aylantiring, xodimlarni tanlang va topshiriqlarni muddatlari bilan taqsimlang.",
    steps: [
      "Buyurtmani tasdiqlab, loyiha ochish",
      "Mutaxassislarga alohida topshiriqlar biriktirish",
      "Bajarilgan ishlarni tekshirib qabul qilish yoki qaytarish",
    ],
    highlight: "Jamoa yuklamasi va muddatlar bitta ekranda",
  },
  {
    key: "developer",
    label: "Dasturchi",
    icon: <Laptop size={20} />,
    tagline: "Ijrochi va mutaxassis",
    description: "Faqat o'zingizga tegishli topshiriqlarni qulay doskada ko'ring, bajaring va portfoliongizni yarating.",
    steps: [
      "'Mening ishim' doskasidan topshiriqlarni qabul qilish",
      "Topshiriqni 'Jarayonda'ga surib, ish boshlash",
      "Natija va fayllarni tekshiruvga yuborish",
    ],
    highlight: "Chalg'ituvchi ortiqcha ma'lumotlarsiz shaxsiy doska",
  },
  {
    key: "boss",
    label: "Boshliq",
    icon: <Users size={20} />,
    tagline: "Rahbariyat va umumiy nazorat",
    description: "Barcha boshqarmalar, loyihalar va xodimlar faoliyatini umumiy tahliliy bosh panelda kuzating.",
    steps: [
      "Haftalik, oylik va yillik jami ishlarni tahlil qilish",
      "Xizmat safarlari va xodimlar bandligini belgilash",
      "Takliflar va muhim tashabbuslar bo'yicha qaror qabul qilish",
    ],
    highlight: "Haqiqiy raqamlar va to'liq audit tarixi",
  },
];

export default function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light")
  );
  const [activeRole, setActiveRole] = useState<RoleKey>("department");

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
  };

  const currentRole = ROLES.find((r) => r.key === activeRole) || ROLES[0];

  return (
    <div className="landing">
      <a className="skip-link" href="#landing-main">
        {T.nav.skipContent}
      </a>

      {/* Top Navbar */}
      <header className="landing-header">
        <Link to="/" className="brand landing-brand">
          <span className="brand-mark">
            <Sparkles size={20} />
          </span>
          <span className="brand-copy">
            <strong>{T.app}</strong>
            <span>{T.nav.workspace}</span>
          </span>
        </Link>

        <nav className="landing-nav" aria-label={T.nav.menu}>
          <Button
            variant="ghost"
            className="landing-theme"
            onClick={toggleTheme}
            aria-label={T.nav.theme}
            title={T.nav.theme}
            aria-pressed={theme === "dark"}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </Button>
          <Link to="/kirish" className="btn btn-ghost">
            {T.landing.login}
          </Link>
          <Link to="/royxatdan-otish" className="btn btn-primary">
            {T.landing.register}
          </Link>
        </nav>
      </header>

      <main id="landing-main" className="landing-main" tabIndex={-1}>
        {/* Hero Section */}
        <section className="landing-hero">
          <span className="landing-eyebrow">
            <Sparkles size={14} /> 1 daqiqada tushunish oson · TeamFlow
          </span>
          <h1>Barcha topshiriqlar, buyurtmalar va jamoa — bir qarashda tushunarli</h1>
          <p>
            Texnik atamalarsiz, o‘rganish shart bo‘lmagan sodda ish maydoni.
            Boshqarma buyurtmasidan tortib dasturchi topshirig‘igacha hamma narsa bitta oqimda ishlaydi.
          </p>

          <div className="landing-actions">
            <Link to="/royxatdan-otish" className="btn btn-primary btn-lg landing-hero-btn">
              Boshlash — Ro‘yxatdan o‘tish <ArrowRight size={18} />
            </Link>
            <Link to="/kirish" className="btn btn-lg">
              Tizimga kirish
            </Link>
          </div>

          <div className="landing-trust-bar">
            <span>
              <Check size={16} /> 100% O‘zbek lotin tilida
            </span>
            <span>
              <Check size={16} /> O‘rganish shart emas
            </span>
            <span>
              <Check size={16} /> Telegram bot bildirishnomalari
            </span>
          </div>
        </section>

        {/* Live UI Mockup Preview */}
        <section className="landing-preview-section" aria-label="Tizim ko'rinishi">
          <div className="landing-preview-card">
            <div className="landing-preview-topbar">
              <div className="landing-window-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <span className="landing-preview-title">TeamFlow — Asosiy ish maydoni</span>
              <div className="landing-preview-user">
                <span className="preview-avatar">N</span>
                <span>Nodir Qodirov (Menejer)</span>
              </div>
            </div>

            <div className="landing-mockup-body">
              <div className="landing-mockup-kpis">
                <div className="mock-kpi">
                  <small>Faol topshiriqlar</small>
                  <strong>14 ta</strong>
                </div>
                <div className="mock-kpi">
                  <small>Tekshiruvda</small>
                  <strong style={{ color: "var(--primary)" }}>3 ta</strong>
                </div>
                <div className="mock-kpi">
                  <small>Shu hafta bajarildi</small>
                  <strong style={{ color: "var(--success)" }}>28 ta</strong>
                </div>
                <div className="mock-kpi">
                  <small>Jamoa a'zolari</small>
                  <strong>12 nafar</strong>
                </div>
              </div>

              {/* Kanban columns */}
              <div className="landing-kanban-preview">
                <div className="mock-col">
                  <div className="mock-col-header">
                    <span>📋 Nazoratda</span>
                    <span className="mock-badge">4</span>
                  </div>
                  <div className="mock-task-card">
                    <span className="mock-task-code">TSK-104</span>
                    <h4>Yangi API moduli</h4>
                    <small>Muddat: 28.10.2026 · O‘rta</small>
                  </div>
                </div>

                <div className="mock-col mock-col-active">
                  <div className="mock-col-header">
                    <span>⚡ Jarayonda</span>
                    <span className="mock-badge mock-badge-active">5</span>
                  </div>
                  <div className="mock-task-card">
                    <span className="mock-task-code">TSK-102</span>
                    <h4>Mobil dizayn yangilanishi</h4>
                    <small>Ijrochi: Ali V. · 75% tayyor</small>
                    <div className="mock-progress-bar">
                      <div className="mock-progress-fill" style={{ width: "75%" }} />
                    </div>
                  </div>
                </div>

                <div className="mock-col">
                  <div className="mock-col-header">
                    <span>🔍 Tekshiruvda</span>
                    <span className="mock-badge">3</span>
                  </div>
                  <div className="mock-task-card">
                    <span className="mock-task-code">TSK-99</span>
                    <h4>Hisobot moduli tayyor</h4>
                    <span className="mock-tag-review">Menejer tasdig‘i kutilmoqda</span>
                  </div>
                </div>

                <div className="mock-col">
                  <div className="mock-col-header">
                    <span>✅ Bajarildi</span>
                    <span className="mock-badge">28</span>
                  </div>
                  <div className="mock-task-card mock-task-done">
                    <span className="mock-task-code">TSK-95</span>
                    <h4>Foydalanuvchi avatari</h4>
                    <small style={{ color: "var(--success)" }}>Qabul qilindi</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="landing-preview-caption">
            💡 Birinchi qarashdayoq kim qaysi ishni qilayotgani, nimalar tekshiruvda ekani va muddatlar ko‘rinib turadi.
          </p>
        </section>

        {/* 3-Step Simple Workflow */}
        <section className="landing-steps-section" aria-labelledby="steps-heading">
          <div className="section-header">
            <span className="landing-eyebrow">Oddiy va mantiqiy</span>
            <h2 id="steps-heading">Qanday ishlaydi? 3 ta oddiy qadam</h2>
            <p>Hech qanday murakkab qoidalar yo‘q — ish jarayoni har bir bosqichda aniq ko‘rinadi.</p>
          </div>

          <div className="landing-steps-grid">
            <div className="landing-step-card">
              <span className="landing-step-num">1</span>
              <div className="landing-step-icon step-amber">
                <Building2 size={24} />
              </div>
              <h3>1. Boshqarma buyurtma yuboradi</h3>
              <p>
                Boshqarma qog‘ozbozliksiz Word (.docx) texnik topshirig‘ini tizimga yuklaydi va muddatini belgilaydi.
              </p>
            </div>

            <div className="landing-step-card">
              <span className="landing-step-num">2</span>
              <div className="landing-step-icon step-indigo">
                <FolderKanban size={24} />
              </div>
              <h3>2. Menejer topshiriqlarni taqsimlaydi</h3>
              <p>
                Loyiha menejeri buyurtmani tasdiqlaydi, jamoa a’zolarini yig‘adi va har bir xodimga aniq topshiriq biriktiradi.
              </p>
            </div>

            <div className="landing-step-card">
              <span className="landing-step-num">3</span>
              <div className="landing-step-icon step-green">
                <CheckCircle size={24} />
              </div>
              <h3>3. Dasturchi bajaradi va topshiradi</h3>
              <p>
                Dasturchi ishni bajarib, tekshiruvga yuboradi. Menejer qabul qiladi va loyiha muvaffaqiyatli yakunlanadi.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Role Switcher */}
        <section className="landing-roles-section" aria-labelledby="roles-heading">
          <div className="section-header">
            <span className="landing-eyebrow">Har bir ishtirokchi uchun qulay</span>
            <h2 id="roles-heading">Sizning rolingiz qanday?</h2>
            <p>O‘zingizga mos rolni tanlang va tizim sizga nima berishini darhol ko‘ring.</p>
          </div>

          <div className="landing-role-nav" role="tablist" aria-label="Rollar ro'yxati">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={activeRole === r.key}
                className={`landing-role-tab ${activeRole === r.key ? "is-active" : ""}`}
                onClick={() => setActiveRole(r.key)}
              >
                <span className="role-tab-icon">{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>

          <div className="landing-role-box" role="tabpanel">
            <div className="role-box-header">
              <div className="role-box-title">
                <span className="role-box-icon">{currentRole.icon}</span>
                <div>
                  <h3>{currentRole.label}</h3>
                  <p>{currentRole.tagline}</p>
                </div>
              </div>
              <span className="role-highlight-pill">{currentRole.highlight}</span>
            </div>

            <p className="role-box-desc">{currentRole.description}</p>

            <div className="role-box-steps">
              <h4>Siz bajaradigan asosiy qadamlar:</h4>
              <ul>
                {currentRole.steps.map((st, i) => (
                  <li key={i}>
                    <span className="step-check">
                      <Check size={14} />
                    </span>
                    <span>{st}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Features / Benefits Grid */}
        <section className="landing-feature-section" aria-labelledby="features-heading">
          <div className="section-header">
            <span className="landing-eyebrow">Afzalliklar</span>
            <h2 id="features-heading">Nega aynan TeamFlow?</h2>
            <p>Kundalik ishingizni tezlashtiradigan va vaqtingizni tejaydigan imkoniyatlar.</p>
          </div>

          <div className="landing-features">
            <article className="landing-feature">
              <div className="landing-feature-icon">
                <FileText size={22} color="var(--primary)" />
              </div>
              <h3>Word (.docx) brauzerda ochiladi</h3>
              <p>
                Fayllarni yuklab olib ochish shart emas. Har qanday texnik topshiriq to‘g‘ridan-to‘g‘ri brauzer modalida ko‘rinadi.
              </p>
            </article>

            <article className="landing-feature">
              <div className="landing-feature-icon">
                <Send size={22} color="var(--success)" />
              </div>
              <h3>Telegram bot bildirishnomalari</h3>
              <p>
                Yangi topshiriq, izoh yoki tasdiq kelganda Telegram bot darhol sizga xabar beradi. Muhim ishlar esdan chiqmaydi.
              </p>
            </article>

            <article className="landing-feature">
              <div className="landing-feature-icon">
                <Zap size={22} color="var(--warning)" />
              </div>
              <h3>Tezkor qidiruv (Ctrl + K)</h3>
              <p>
                Istalgan topshiriq kodi (masalan, TSK-12) yoki loyiha nomini 1–2 raqam kiritish orqali darhol topasiz.
              </p>
            </article>

            <article className="landing-feature">
              <div className="landing-feature-icon">
                <ShieldCheck size={22} color="var(--info)" />
              </div>
              <h3>Shaffof va xavfsiz nazorat</h3>
              <p>
                Har kim faqat o‘ziga tegishli loyiha va topshiriqlarni ko‘radi. Ruxsatlar qat’iy server darajasida tekshiriladi.
              </p>
            </article>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="landing-cta-banner">
          <div className="landing-cta-content">
            <h2>Jamoangiz ishini bugunoq tartibga soling</h2>
            <p>Hech qanday murakkab qo‘llanmalarsiz, hoziroq ro‘yxatdan o‘tib boshlang.</p>
            <div className="landing-cta-buttons">
              <Link to="/royxatdan-otish" className="btn btn-primary btn-lg">
                Ro‘yxatdan o‘tish <ArrowRight size={18} />
              </Link>
              <Link to="/kirish" className="btn btn-lg">
                Tizimga kirish
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span>&copy; {new Date().getFullYear()} {T.app}. Barcha huquqlar himoyalangan.</span>
          <span>100% O‘zbek lotin tilida · Tezkor va xavfsiz</span>
        </div>
      </footer>
    </div>
  );
}
