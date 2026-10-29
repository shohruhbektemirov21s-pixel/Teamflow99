import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth, useMe } from "@/app/auth";
import { usePagedList } from "@/app/queries";
import { TaskTable } from "@/features/tasks/TaskTable";
import { api, ApiError, formData } from "@/shared/api";
import { fmtDate } from "@/shared/format";
import { useMeta } from "@/shared/meta";
import { PasswordField } from "@/shared/PasswordField";
import { T } from "@/shared/text";
import type { Profile, Task } from "@/shared/types";
import { Badge, Button, ErrorBox, Field, SkeletonRows, useToast } from "@/shared/ui";
import { Pagination } from "@/shared/ui/Pagination";

import { ProfileHeader } from "./ProfileHeader";
import { BusinessTripPanel } from "./BusinessTripPanel";
import { ResponsibleProjects } from "./ResponsibleProjects";
import { UserProfileView } from "./UserProfileView";

const fieldError = (err: unknown, name: string) => (err instanceof ApiError ? err.field(name) : undefined);
/** Maydonga bog'lanmagan xato bo'lsa — toast bilan ko'rsatiladi (maydon xatolari maydon yonida). */
const generalError = (err: unknown) =>
  err instanceof ApiError ? (Object.keys(err.fields).length ? null : err.message) : T.common.errorGeneric;

export default function ProfilePage() {
  const me = useMe();
  if (me.role === "user") {
    return <UserProfileView />;
  }
  const meta = useMeta();
  const bot = meta.telegram_bot;
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { refresh } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [telegram, setTelegram] = useState("");
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  const q = useQuery({ queryKey: ["profile"], queryFn: () => api.get<Profile>("/auth/profile/") });
  const p = q.data;
  // Dasturchi profilida — faqat o'ziga biriktirilgan vazifalar (server `mine=1` bo'yicha filtrlaydi)
  const developer = me.role === "developer";
  const myTasks = usePagedList<Task>(["tasks", "mine", "profile"], "/tasks/", { mine: 1 }, developer);

  useEffect(() => {
    if (p) {
      setFirst(p.first_name);
      setLast(p.last_name);
      setTelegram(p.telegram_username || "");
    }
  }, [p]);

  const infoMut = useMutation({
    mutationFn: () => api.patch<Profile>("/auth/profile/", {
      first_name: first,
      last_name: last,
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
      void qc.invalidateQueries(); // rasm ro'yxatlar, jadval va chatda ham yangilansin
      void refresh();
    },
    onError: (err) => toast(err instanceof ApiError ? err.field("avatar") || err.message : T.common.errorGeneric, "error"),
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

  return (
    <div className="stack" style={{ maxWidth: 1180, width: "100%", margin: "0 auto", gap: 20 }}>
      <ProfileHeader
        user={me}
        subtitle={me.department_name || me.specialty || me.role_label}
        stats={p?.stats && { active: p.stats.active, overdue: p.stats.overdue, review: p.stats.in_review, done: p.stats.done }}
        activeKey={statusFilter}
        onSelect={(key) => setStatusFilter((curr) => (curr === key ? "" : key))}
        actions={
          <>
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
            <Button size="sm" icon={<ImagePlus />} loading={photoMut.isPending} onClick={() => photoInput.current?.click()}>
              {me.avatar ? T.profile.photoChange : T.profile.photoUpload}
            </Button>
            {me.avatar && (
              <Button size="sm" variant="ghost" icon={<Trash2 />} disabled={photoMut.isPending} onClick={() => photoMut.mutate(null)}>
                {T.profile.photoRemove}
              </Button>
            )}
          </>
        }
      />

      {p?.activity && (
        <div className="row-wrap" aria-label={T.profile.stats}>
          <Badge tone="info">{T.user.activityReviews(p.activity.reviews)}</Badge>
          <Badge tone="success">{T.user.activityFollowing(p.activity.following)}</Badge>
        </div>
      )}

      <div className="profile-grid">
        <div className="card card-pad stack">
          <h3>{T.profile.editInfoTitle}</h3>
          {q.isLoading ? (
            <SkeletonRows rows={2} />
          ) : (
            <form
              className="grid-2"
              onSubmit={(e) => {
                e.preventDefault();
                infoMut.mutate();
              }}
            >
              <Field label={T.profile.firstName} error={fieldError(infoMut.error, "first_name")}>
                {(id, bad) => <input id={id} className="input" aria-invalid={bad} value={first} onChange={(e) => setFirst(e.target.value)} />}
              </Field>
              <Field label={T.profile.lastName} error={fieldError(infoMut.error, "last_name")}>
                {(id, bad) => <input id={id} className="input" aria-invalid={bad} value={last} onChange={(e) => setLast(e.target.value)} />}
              </Field>
              <Field
                label={T.profile.telegram}
                hint={
                  bot ? (
                    <span className="row-wrap" style={{ gap: 6, alignItems: "center" }}>
                      <span>{T.profile.telegramHint}</span>
                      <a href={`https://t.me/${bot}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 650, color: "var(--primary)" }}>
                        @{bot}
                      </a>
                    </span>
                  ) : (
                    T.profile.telegramHint
                  )
                }
                error={fieldError(infoMut.error, "telegram_username")}>
                {(id, bad) => (
                  <div className="stack" style={{ gap: 6 }}>
                    <div className="row-wrap" style={{ gap: 8 }}>
                      <input
                        id={id}
                        className="input"
                        style={{ flex: 1 }}
                        aria-invalid={bad}
                        value={telegram}
                        placeholder={T.profile.telegramPh}
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
                        <span>Botga kirib <strong>/start</strong> bosing ("Botga o'tish" tugmasi orqali).</span>
                      </span>
                    ) : null}
                  </div>
                )}
              </Field>
              <Field label={T.profile.login}>{(id) => <input id={id} className="input" value={me.username} disabled />}</Field>
              <Field label={T.profile.dateJoined}>
                {(id) => <input id={id} className="input" value={p?.date_joined ? fmtDate(p.date_joined) : ""} disabled />}
              </Field>
              <div className="form-actions">
                <Button type="submit" variant="primary" loading={infoMut.isPending}>
                  {T.common.save}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="stack">
          {me.role === "boss" && <BusinessTripPanel />}

          {(developer || me.role === "pm") && <ResponsibleProjects employeeId={me.id} own />}

          <form
            className="card card-pad stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (oldPass && newPass) passMut.mutate();
            }}
          >
            <h3>{T.profile.passwordTitle}</h3>
            <div className="grid-2">
              <PasswordField label={T.profile.currentPassword} error={fieldError(passMut.error, "current_password")} value={oldPass} onChange={(e) => setOldPass(e.target.value)} autoComplete="current-password" />
              <PasswordField label={T.profile.newPassword} hint={T.auth.passwordHint} error={fieldError(passMut.error, "new_password")} value={newPass} onChange={(e) => setNewPass(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="form-actions">
              <Button type="submit" variant="primary" loading={passMut.isPending} disabled={!oldPass || !newPass}>
                {T.profile.changePassword}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {developer && (
        <section className="card" aria-label={T.profile.myTasks}>
          <div className="card-head">
            <h3 className="grow">
              {T.profile.myTasks} {myTasks.data && <span className="count-pill soft">{myTasks.pagination?.count}</span>}
            </h3>
          </div>
          {myTasks.error ? (
            <div className="card-pad">
              <ErrorBox error={myTasks.error} onRetry={() => myTasks.refetch()} />
            </div>
          ) : (
            <TaskTable
              tasks={
                statusFilter === "overdue"
                  ? (myTasks.data || []).filter((t) => t.is_overdue)
                  : statusFilter
                  ? (myTasks.data || []).filter((t) => t.status === statusFilter)
                  : myTasks.data
              }
              loading={myTasks.isLoading}
              emptyHint={T.profile.myTasksEmpty}
            />
          )}
          <Pagination data={myTasks.pagination} page={myTasks.page} onPageChange={myTasks.onPageChange} />
        </section>
      )}
    </div>
  );
}
