import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  Send,
  ChevronRight,
  Heart,
  ImagePlus,
  Moon,
  Palette,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth, useMe } from "@/app/auth";
import { useTheme } from "@/app/Layout";
import { useModal } from "@/app/modals";
import { api, ApiError, formData } from "@/shared/api";
import { fmtDate } from "@/shared/format";
import { useMeta } from "@/shared/meta";
import { PasswordField } from "@/shared/PasswordField";
import { T } from "@/shared/text";
import type { Profile } from "@/shared/types";
import { Avatar, Badge, Button, Field, SkeletonRows, useToast } from "@/shared/ui";

const fieldError = (err: unknown, name: string) => (err instanceof ApiError ? err.field(name) : undefined);
const generalError = (err: unknown) =>
  err instanceof ApiError ? (Object.keys(err.fields).length ? null : err.message) : T.common.errorGeneric;

type ProfileTab = "info" | "security" | "appearance";

/**
 * Oddiy foydalanuvchi uchun zamonaviy SaaS profili:
 * - Cover va katta avatar, rasm yuklash/almashtirish/o'chirish
 * - Faollik kartalari (Baholangan loyihalar, Kuzatilayotgan dasturchilar)
 * - Tiniq va qulay tablar (Shaxsiy ma'lumotlar, Xavfsizlik, Ko'rinish/Tema)
 * - Hech qanday chalg'ituvchi texnik inputlarsiz (login/sana inputlari yo'q)
 */
export function UserProfileView() {
  const me = useMe();
  const { refresh } = useAuth();
  const { open } = useModal();
  const toast = useToast();
  const qc = useQueryClient();
  const [theme, toggleTheme] = useTheme();

  const meta = useMeta();
  const bot = meta.telegram_bot;
  const [activeTab, setActiveTab] = useState<ProfileTab>("info");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [telegram, setTelegram] = useState("");
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  const q = useQuery({ queryKey: ["profile"], queryFn: () => api.get<Profile>("/auth/profile/") });
  const p = q.data;

  useEffect(() => {
    if (p) {
      setFirst(p.first_name || "");
      setLast(p.last_name || "");
      setEmail(p.email || "");
      setBio(p.bio || "");
      setTelegram(p.telegram_username || "");
    }
  }, [p]);

  const infoMut = useMutation({
    mutationFn: () =>
      api.patch<Profile>("/auth/profile/", {
        first_name: first,
        last_name: last,
        email,
        bio,
        telegram_username: telegram,
      }),
    onSuccess: () => {
      toast(T.profile.savedToast);
      qc.invalidateQueries({ queryKey: ["profile"] });
      void refresh();
    },
    onError: (err) => {
      const msg = generalError(err);
      if (msg) toast(msg, "error");
    },
  });

  const photoInput = useRef<HTMLInputElement>(null);
  const photoMut = useMutation({
    mutationFn: (file: File | null) =>
      file ? api.post<Profile>("/auth/avatar/", formData({}, [file], "avatar")) : api.del<Profile>("/auth/avatar/"),
    onSuccess: (_d, file) => {
      toast(file ? T.profile.photoSavedToast : T.profile.photoRemovedToast);
      void qc.invalidateQueries();
      void refresh();
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.field("avatar") || err.message : T.common.errorGeneric, "error"),
  });

  const passMut = useMutation({
    mutationFn: () => api.post("/auth/password/", { current_password: oldPass, new_password: newPass }),
    onSuccess: () => {
      toast(T.profile.passwordChangedToast);
      setOldPass("");
      setNewPass("");
    },
    onError: (err) => {
      const msg = generalError(err);
      if (msg) toast(msg, "error");
    },
  });

  const reviewsCount = p?.activity?.reviews ?? 0;
  const followingCount = p?.activity?.following ?? 0;

  return (
    <div className="stack uprofile-shell">
      {/* 1. Hero / Header Card */}
      <div className="card uprofile-card">
        <div className="uprofile-cover" aria-hidden />

        <div className="uprofile-head">
          <div className="uprofile-avatar-wrap">
            {me.avatar ? (
              <button
                type="button"
                className="avatar-btn"
                aria-label={T.people.photoOpen}
                onClick={() => {
                  if (me.avatar) open({ photo: me.id, name: me.full_name, src: me.avatar });
                }}
              >
                <Avatar user={me} size="xl" card={false} />
              </button>
            ) : (
              <Avatar user={me} size="xl" card={false} />
            )}
          </div>

          <div className="uprofile-identity">
            <div className="uprofile-title-row">
              <h1 className="uprofile-name">{me.full_name || me.username}</h1>
              <Badge tone="violet" dot={false}>
                <Sparkles size={12} aria-hidden /> {me.role_label || T.user.roleLabel}
              </Badge>
            </div>

            <div className="uprofile-meta">
              <span className="uprofile-meta-item">
                <User size={14} aria-hidden /> @{me.username}
              </span>
              {p?.date_joined && (
                <span className="uprofile-meta-item">
                  <Calendar size={14} aria-hidden /> {fmtDate(p.date_joined)} {T.user.sinceDate}
                </span>
              )}
            </div>
          </div>

          <div className="uprofile-actions">
            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) photoMut.mutate(file);
              }}
            />
            <Button
              size="sm"
              icon={<ImagePlus size={15} />}
              loading={photoMut.isPending}
              onClick={() => photoInput.current?.click()}
            >
              {me.avatar ? T.profile.photoChange : T.profile.photoUpload}
            </Button>
            {me.avatar && (
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 size={15} />}
                disabled={photoMut.isPending}
                onClick={() => photoMut.mutate(null)}
              >
                {T.profile.photoRemove}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Faollik kartalari (StatCards) */}
      <div className="grid-2 uprofile-stats-row">
        <Link to="/baholarim" className="card uprofile-stat-card">
          <span className="ustat-icon tone-amber" aria-hidden>
            <Star size={20} className="ustar" />
          </span>
          <div className="ustat-text">
            <b className="ustat-value">{reviewsCount}</b>
            <span className="muted">{T.user.myReviews}</span>
          </div>
          <span className="uprofile-stat-arrow">
            <ChevronRight size={18} aria-hidden />
          </span>
        </Link>

        <Link to="/" className="card uprofile-stat-card">
          <span className="ustat-icon tone-danger" aria-hidden>
            <Heart size={20} style={{ color: "var(--danger)", fill: "currentColor" }} />
          </span>
          <div className="ustat-text">
            <b className="ustat-value">{followingCount}</b>
            <span className="muted">{T.user.followingTitle}</span>
          </div>
          <span className="uprofile-stat-arrow">
            <ChevronRight size={18} aria-hidden />
          </span>
        </Link>
      </div>

      {/* 3. Tablar */}
      <div className="uprofile-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "info"}
          className={`uprofile-tab ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          <User size={16} aria-hidden /> {T.user.tabGeneral}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "security"}
          className={`uprofile-tab ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <ShieldCheck size={16} aria-hidden /> {T.user.tabSecurity}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "appearance"}
          className={`uprofile-tab ${activeTab === "appearance" ? "active" : ""}`}
          onClick={() => setActiveTab("appearance")}
        >
          <Palette size={16} aria-hidden /> {T.user.tabAppearance}
        </button>
      </div>

      {/* 4. Tab kontentlari */}
      {activeTab === "info" && (
        <section className="card card-pad stack" aria-label={T.user.tabGeneral}>
          <div className="card-head" style={{ padding: 0 }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>{T.profile.editInfoTitle}</h2>
            </div>
          </div>

          {q.isLoading ? (
            <SkeletonRows rows={3} />
          ) : (
            <form
              className="stack"
              style={{ gap: 16 }}
              onSubmit={(e) => {
                e.preventDefault();
                infoMut.mutate();
              }}
            >
              <div className="grid-2">
                <Field label={T.profile.firstName} error={fieldError(infoMut.error, "first_name")}>
                  {(id, bad) => (
                    <input
                      id={id}
                      className="input"
                      aria-invalid={bad}
                      value={first}
                      placeholder={T.profile.firstName}
                      onChange={(e) => setFirst(e.target.value)}
                    />
                  )}
                </Field>
                <Field label={T.profile.lastName} error={fieldError(infoMut.error, "last_name")}>
                  {(id, bad) => (
                    <input
                      id={id}
                      className="input"
                      aria-invalid={bad}
                      value={last}
                      placeholder={T.profile.lastName}
                      onChange={(e) => setLast(e.target.value)}
                    />
                  )}
                </Field>
              </div>

              <div className="grid-2">
                <Field label={T.profile.email} error={fieldError(infoMut.error, "email")}>
                  {(id, bad) => (
                    <input
                      id={id}
                      className="input"
                      type="email"
                      autoComplete="email"
                      aria-invalid={bad}
                      value={email}
                      placeholder="nomingiz@misol.uz"
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  )}
                </Field>

                <Field
                  label={T.profile.telegram}
                  hint={
                    bot ? (
                      <span className="row-wrap" style={{ gap: 6, alignItems: "center" }}>
                        <span>{T.user.telegramSimpleHint}.</span>
                        <a
                          href={`https://t.me/${bot}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: "var(--primary)" }}
                        >
                          <Send size={12} /> @{bot} botiga o'tish →
                        </a>
                      </span>
                    ) : (
                      T.user.telegramSimpleHint
                    )
                  }
                  error={fieldError(infoMut.error, "telegram_username")}
                >
                  {(id, bad) => (
                    <div className="stack" style={{ gap: 6 }}>
                      <div className="row-wrap" style={{ gap: 8 }}>
                        <input
                          id={id}
                          className="input"
                          style={{ flex: 1 }}
                          aria-invalid={bad}
                          value={telegram}
                          placeholder="@username"
                          onChange={(e) => setTelegram(e.target.value)}
                        />
                        {bot && (
                          <a
                            href={`https://t.me/${bot}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              color: "#0284c7",
                              borderColor: "#bae6fd",
                              fontWeight: 650,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Send size={14} /> Botga o'tish →
                          </a>
                        )}
                      </div>
                      {p?.telegram_linked ? (
                        <span style={{ fontSize: 12, color: "var(--success)", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
                          <Check size={14} /> Telegram bot ulangan (xabarlar faol keladi)
                        </span>
                      ) : bot ? (
                        <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <span>Botga kirib <strong>/start</strong> bosing:</span>
                          <a href={`https://t.me/${bot}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 650, color: "var(--primary)" }}>
                            @{bot}
                          </a>
                        </span>
                      ) : null}
                    </div>
                  )}
                </Field>
              </div>

              <Field
                label={T.profile.bio}
                hint={T.user.bioHint}
                error={fieldError(infoMut.error, "bio")}
              >
                {(id, bad) => (
                  <textarea
                    id={id}
                    className="textarea"
                    rows={4}
                    maxLength={1000}
                    aria-invalid={bad}
                    value={bio}
                    placeholder={T.user.bioPlaceholder}
                    onChange={(e) => setBio(e.target.value)}
                  />
                )}
              </Field>

              <div className="form-actions" style={{ justifyContent: "flex-end" }}>
                <Button type="submit" variant="primary" loading={infoMut.isPending}>
                  {T.common.save}
                </Button>
              </div>
            </form>
          )}
        </section>
      )}

      {activeTab === "security" && (
        <section className="card card-pad stack" aria-label={T.user.tabSecurity}>
          <div className="card-head" style={{ padding: 0 }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>{T.profile.passwordTitle}</h2>
            </div>
          </div>

          <form
            className="stack"
            style={{ gap: 16 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (oldPass && newPass) passMut.mutate();
            }}
          >
            <div className="grid-2">
              <PasswordField label={T.profile.currentPassword} error={fieldError(passMut.error, "current_password")} value={oldPass} onChange={(e) => setOldPass(e.target.value)} autoComplete="current-password" placeholder="••••••••" />

              <PasswordField label={T.profile.newPassword} hint={T.auth.passwordHint} error={fieldError(passMut.error, "new_password")} value={newPass} onChange={(e) => setNewPass(e.target.value)} autoComplete="new-password" placeholder="••••••••" />
            </div>

            <div className="form-actions" style={{ justifyContent: "flex-end" }}>
              <Button type="submit" variant="primary" loading={passMut.isPending} disabled={!oldPass || !newPass}>
                {T.profile.changePassword}
              </Button>
            </div>
          </form>
        </section>
      )}

      {activeTab === "appearance" && (
        <section className="card card-pad stack" aria-label={T.user.tabAppearance}>
          <div className="card-head" style={{ padding: 0 }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>{T.user.appearanceTitle}</h2>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 16 }}>
            <button
              type="button"
              className={`card uprofile-theme-card ${theme === "light" ? "active" : ""}`}
              onClick={() => {
                if (theme !== "light") toggleTheme();
              }}
            >
              <div className="uprofile-theme-preview light-preview" aria-hidden>
                <div className="preview-topbar" />
                <div className="preview-body">
                  <div className="preview-sidebar" />
                  <div className="preview-card" />
                </div>
              </div>
              <div className="uprofile-theme-label">
                <Sun size={18} className="muted" aria-hidden />
                <b>{T.user.themeLight}</b>
                {theme === "light" && <span className="uprofile-theme-check"><Check size={14} /></span>}
              </div>
            </button>

            <button
              type="button"
              className={`card uprofile-theme-card ${theme === "dark" ? "active" : ""}`}
              onClick={() => {
                if (theme !== "dark") toggleTheme();
              }}
            >
              <div className="uprofile-theme-preview dark-preview" aria-hidden>
                <div className="preview-topbar" />
                <div className="preview-body">
                  <div className="preview-sidebar" />
                  <div className="preview-card" />
                </div>
              </div>
              <div className="uprofile-theme-label">
                <Moon size={18} className="muted" aria-hidden />
                <b>{T.user.themeDark}</b>
                {theme === "dark" && <span className="uprofile-theme-check"><Check size={14} /></span>}
              </div>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
