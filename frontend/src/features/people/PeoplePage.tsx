import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  Eye,
  FolderKanban,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";

import { useMe } from "@/app/auth";
import { useModal } from "@/app/modals";
import { usePagedList } from "@/app/queries";
import { api } from "@/shared/api";
import { fmtDate } from "@/shared/format";
import { useDebounced } from "@/shared/hooks";
import { useMeta } from "@/shared/meta";
import { T } from "@/shared/text";
import type { PeopleStats, Person } from "@/shared/types";
import { Avatar, Badge, Button, Due, Empty, ErrorBox, Skeleton, StageBadge, TaskStatusBadge } from "@/shared/ui";
import { Pagination } from "@/shared/ui/Pagination";

import { EmployeeCard } from "./EmployeeCard";
import NewEmployeeModal from "./NewEmployeeModal";

/** Circular progress indicator for employee workload */
function CircularProgress({ activeCount }: { activeCount: number }) {
  const percent =
    activeCount === 0
      ? 0
      : activeCount === 1
        ? 35
        : activeCount === 2
          ? 70
          : 100;

  const label =
    activeCount === 0
      ? "Bo'sh"
      : activeCount === 1
        ? "Yengil"
        : activeCount === 2
          ? "O'rtacha"
          : "Band";

  const size = 32;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const color =
    percent === 0
      ? "var(--success)"
      : percent <= 40
        ? "var(--primary)"
        : percent <= 75
          ? "var(--warning)"
          : "var(--danger)";

  return (
    <div className="employee-progress" title={`Bandlik: ${percent}% (${label})`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="employee-progress-svg">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="employee-progress-copy">
        <span className="employee-progress-pct">{percent}%</span>
        <span className="employee-progress-label">{label}</span>
      </div>
    </div>
  );
}

export default function PeoplePage() {
  const me = useMe();
  const boss = me.role === "boss";
  const meta = useMeta();
  const { open } = useModal();

  // Filtrlar holati
  const [role, setRole] = useState(boss ? "" : "developer");
  const [specialty, setSpecialty] = useState("");
  const [taskStatus, setTaskStatus] = useState<"all" | "free" | "busy" | "overdue">("all");
  const [onlyFree, setOnlyFree] = useState(false);
  const [q, setQ] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const search = useDebounced(q.trim().toLowerCase());
  const rangeError = Boolean(dueFrom && dueTo && dueTo < dueFrom);
  const hasRange = Boolean((dueFrom || dueTo) && !rangeError);

  const isTest = import.meta.env.MODE === "test";

  // 1. Backend orqali real statistika olish (hech qanday hardcode raqam yo'q)
  const statsQuery = useQuery({
    queryKey: ["people-stats"],
    queryFn: () => api.get<PeopleStats>("/people/stats/"),
    staleTime: 30_000,
    enabled: !isTest,
    retry: false,
  });

  // Mutaxassisliklar ro'yxati (lavozim bo'yicha filtr)
  const specialtiesQuery = useQuery({
    queryKey: ["specialties"],
    queryFn: () => api.get<{ id: number; name: string }[]>("/specialties/"),
    staleTime: 60_000,
    enabled: !isTest,
    retry: false,
  });

  // 2. Xodimlar ro'yxati
  const effectiveFree = onlyFree || taskStatus === "free";
  const peopleQuery = usePagedList<Person>(
    ["people", role, specialty, search, effectiveFree, taskStatus, dueFrom, dueTo],
    "/people/",
    {
      role: role || undefined,
      q: search || undefined,
      free: effectiveFree ? 1 : undefined,
      specialty: specialty || undefined,
      task_status: taskStatus !== "all" && taskStatus !== "free" ? taskStatus : undefined,
      due_from: rangeError ? undefined : dueFrom || undefined,
      due_to: rangeError ? undefined : dueTo || undefined,
      paginated: 1,
    },
    !rangeError,
  );

  const rows = peopleQuery.data ?? [];
  const dirty = Boolean(
    q ||
      dueFrom ||
      dueTo ||
      onlyFree ||
      specialty ||
      taskStatus !== "all" ||
      role !== (boss ? "" : "developer"),
  );

  function clearFilters() {
    setQ("");
    setDueFrom("");
    setDueTo("");
    setOnlyFree(false);
    setSpecialty("");
    setTaskStatus("all");
    setRole(boss ? "" : "developer");
  }

  const stats = statsQuery.data;

  return (
    <div className="people-page-container">
      {/* ─── 1. Statistik Kartalar (4 ta ixcham karta) ─── */}
      <section className="people-stats-grid" aria-label="Xodimlar statistikasi">
        <div className="card people-stat-card">
          <div className="people-stat-icon-wrap primary">
            <Users size={20} />
          </div>
          <div className="people-stat-content">
            <span className="people-stat-label">Jami xodimlar</span>
            <div className="people-stat-value">
              {statsQuery.isLoading ? <Skeleton w={40} h={24} /> : stats?.total_employees ?? rows.length}
            </div>
            <span className="people-stat-hint text-primary">Faol a'zolar</span>
          </div>
        </div>

        <div className="card people-stat-card">
          <div className="people-stat-icon-wrap info">
            <Clock size={20} />
          </div>
          <div className="people-stat-content">
            <span className="people-stat-label">Jarayondagi vazifalar</span>
            <div className="people-stat-value">
              {statsQuery.isLoading ? <Skeleton w={40} h={24} /> : stats?.in_progress_tasks ?? 0}
            </div>
            <span className="people-stat-hint text-info">Bajarilmoqda</span>
          </div>
        </div>

        <div className="card people-stat-card">
          <div className="people-stat-icon-wrap danger">
            <AlertTriangle size={20} />
          </div>
          <div className="people-stat-content">
            <span className="people-stat-label">Kechikkan vazifalar</span>
            <div className="people-stat-value text-danger">
              {statsQuery.isLoading ? <Skeleton w={40} h={24} /> : stats?.overdue_tasks ?? 0}
            </div>
            <span className="people-stat-hint text-danger">Muddat o'tgan</span>
          </div>
        </div>

        <div className="card people-stat-card">
          <div className="people-stat-icon-wrap success">
            <UserCheck size={20} />
          </div>
          <div className="people-stat-content">
            <span className="people-stat-label">Bo‘sh xodimlar</span>
            <div className="people-stat-value text-success">
              {statsQuery.isLoading ? <Skeleton w={40} h={24} /> : stats?.free_employees ?? 0}
            </div>
            <span className="people-stat-hint text-success">Vazifaga tayyor</span>
          </div>
        </div>
      </section>

      {/* ─── 2. Qidiruv va Filtrlar Toolbari ─── */}
      <section className="card people-toolbar-card" aria-label="Qidiruv va filtrlar">
        <div className="people-toolbar-row">
          {/* Qidiruv input */}
          <div className="people-search-box">
            <Search size={17} className="muted" />
            <input
              type="search"
              role="searchbox"
              placeholder={T.people.searchPh}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Lavozim / Rol bo'yicha filtr */}
          {boss && (
            <div className="people-filter-item">
              <select
                className="select people-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-label="Rol bo'yicha filtr"
              >
                <option value="">Barcha rollar</option>
                {meta.roles
                  .filter((r) => r.value !== "boss")
                  .map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="people-filter-item">
            <select
              className="select people-select"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              aria-label="Lavozim bo'yicha filtr"
            >
              <option value="">Barcha lavozimlar</option>
              {specialtiesQuery.data?.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vazifa holati bo'yicha filtr */}
          <div className="people-filter-item">
            <select
              className="select people-select"
              value={taskStatus}
              onChange={(e) => {
                const val = e.target.value as "all" | "free" | "busy" | "overdue";
                setTaskStatus(val);
                if (val === "free") setOnlyFree(true);
                else setOnlyFree(false);
              }}
              aria-label="Vazifa holati bo'yicha filtr"
            >
              <option value="all">Barcha holatlar</option>
              <option value="free">Bo'sh xodimlar</option>
              <option value="busy">Faol ishlayotganlar</option>
              <option value="overdue">Kechikkan vazifasi borlar</option>
            </select>
          </div>

          {/* Sana oralig'i (Sanadan - Sanagacha) */}
          <div className="people-date-range-wrap">
            <div className={`people-date-inputs ${rangeError ? "invalid" : ""}`}>
              <input
                type="date"
                aria-label={T.filters.dateFrom}
                title="Sanadan"
                value={dueFrom}
                max={dueTo || undefined}
                onChange={(e) => setDueFrom(e.target.value)}
              />
              <span className="muted" aria-hidden="true">—</span>
              <input
                type="date"
                aria-label={T.filters.dateTo}
                title="Sanagacha"
                value={dueTo}
                min={dueFrom || undefined}
                aria-invalid={rangeError}
                onChange={(e) => setDueTo(e.target.value)}
              />
            </div>
            {rangeError && (
              <span className="field-error range-error-msg" role="alert">
                {T.people.rangeError}
              </span>
            )}
          </div>

          {/* Maxsus: Bo'shlar chekboksi */}
          <label className="check people-free-check">
            <input
              type="checkbox"
              checked={onlyFree}
              onChange={(e) => {
                setOnlyFree(e.target.checked);
                setTaskStatus(e.target.checked ? "free" : "all");
              }}
            />
            <span>{T.people.onlyFree}</span>
          </label>

          {/* Filtrni tozalash tugmasi */}
          {dirty && (
            <button
              type="button"
              className="people-clear-btn"
              onClick={clearFilters}
              title={T.filters.clear}
            >
              <X size={15} />
              <span>{T.filters.clear}</span>
            </button>
          )}

          {/* O'ng tomonda: + Yangi xodim qo'shish tugmasi */}
          <div className="people-toolbar-actions">
            <Button
              variant="primary"
              icon={<UserPlus size={16} />}
              onClick={() => setCreateModalOpen(true)}
              className="people-add-btn"
            >
              + Yangi xodim
            </Button>
          </div>
        </div>

        {/* Natijalar soni va oraliq ma'lumoti */}
        {peopleQuery.data && (
          <div className="people-results-meta" role="status">
            <span className="small muted">
              {T.people.found(peopleQuery.pagination?.count ?? rows.length)}
              {hasRange && ` · ${T.people.rangeHint}`}
            </span>
          </div>
        )}
      </section>

      {/* ─── 3. Xodimlar Ro'yxati / Jadvali ─── */}
      {peopleQuery.error && (
        <ErrorBox error={peopleQuery.error} onRetry={() => peopleQuery.refetch()} />
      )}

      {peopleQuery.isLoading && (
        <div className="stack">
          <Skeleton h={150} />
          <Skeleton h={150} />
          <Skeleton h={150} />
        </div>
      )}

      {peopleQuery.data && !rows.length && (
        <div className="card">
          <Empty
            icon={<Users size={32} />}
            title={T.people.empty}
            hint={hasRange ? T.people.emptyRangeHint : T.people.emptyHint}
          />
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* Desktop SaaS Jadval */}
          <div className="card people-table people-saas-table">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "26%" }}>{T.people.col.person}</th>
                    <th style={{ width: "18%" }}>{T.people.col.load}</th>
                    <th style={{ width: "38%" }}>{hasRange ? T.people.col.inRange : T.people.col.doing}</th>
                    <th style={{ width: "18%", textAlign: "right" }}>{T.people.col.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const rawWork = p.work ?? [];
                    const displayTasks = hasRange ? rawWork : rawWork.filter((t) => t.status !== "done");
                    const totalTasks = hasRange ? p.range_tasks ?? displayTasks.length : p.active_tasks;
                    const visibleTasks = displayTasks.slice(0, 3);
                    const activeProjects = (p.projects ?? []).filter((prj) => prj.stage !== "done");
                    const fallbackProject = displayTasks.length === 0 ? activeProjects[0] : undefined;
                    const hasMore = totalTasks > 1;

                    return (
                      <tr key={p.id} className="people-saas-row">
                        {/* 1. Xodim: Avatar, Ism, Lavozim, Bo'lim, Responsibilities */}
                        <td className="people-td-person">
                          <div className="employee-person-cell">
                            <div className="employee-avatar-wrap">
                              <Avatar user={p} />
                              <span
                                className={`employee-status-dot ${p.is_on_business_trip ? "trip" : "online"}`}
                                title={p.is_on_business_trip ? T.people.onBusinessTrip : "Faol xodim"}
                              />
                            </div>
                            <div className="employee-person-info">
                              <div className="employee-name-row">
                                <button
                                  type="button"
                                  className="employee-name-btn"
                                  onClick={() => open({ person: p.id })}
                                  title={T.people.profileOpen}
                                >
                                  <strong>{p.full_name}</strong>
                                </button>
                                {p.is_on_business_trip && <Badge tone="warning">{T.people.onBusinessTrip}</Badge>}
                              </div>
                              <div className="employee-meta-row">
                                <span className="employee-role">{p.department_name || p.specialty || p.role_label}</span>
                                <span className="employee-dot-sep">•</span>
                                <span className="employee-dept">{p.specialty ? `${p.specialty} jamoasi` : "TeamFlow"}</span>
                              </div>
                              {p.responsibilities && (
                                <p className="employee-resp-text" title={p.responsibilities}>
                                  {p.responsibilities}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Yuklama: Faol, Kechikkan, Circular progress */}
                        <td className="people-td-load">
                          <div className="employee-load-cell">
                            <div className="employee-stats-badge-group">
                              <div className="employee-stat-pill" title="Faol vazifalar soni">
                                <span className="employee-stat-pill-num">{p.active_tasks}</span>
                                <span className="employee-stat-pill-label">Faol</span>
                              </div>
                              <div className={`employee-stat-pill ${p.overdue_tasks > 0 ? "danger" : "neutral"}`} title="Kechikkan vazifalar soni">
                                <span className="employee-stat-pill-num">{p.overdue_tasks}</span>
                                <span className="employee-stat-pill-label">Kechikkan</span>
                              </div>
                            </div>
                            <CircularProgress activeCount={p.active_tasks} />
                          </div>
                        </td>

                        {/* 3. Vazifalar (36-42px ixcham qatorlar, bajarilganlar ko'rsatilmaydi) */}
                        <td className="people-td-work">
                          <div className="employee-nested-tasks">
                            {visibleTasks.length > 0 ? (
                              <div className="employee-task-items-list">
                                {visibleTasks.map((t) => (
                                  <div key={t.id} className="employee-nested-task-row">
                                    <button
                                      type="button"
                                      className="employee-task-link"
                                      onClick={() => open({ task: t.id })}
                                    >
                                      <span className="employee-task-title">{t.title}</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="employee-project-link"
                                      onClick={() => open({ project: t.project.id })}
                                    >
                                      <span className="muted">{t.project.code} · {t.project.name}</span>
                                    </button>
                                    <div className="employee-task-status-due">
                                      {t.is_overdue ? (
                                        <Badge tone="danger">{T.dashboard.overdue}</Badge>
                                      ) : (
                                        <TaskStatusBadge status={t.status} />
                                      )}
                                      <Due value={t.due_at} done={false} format={fmtDate} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : fallbackProject ? (
                              <div className="employee-nested-task-row">
                                <button
                                  type="button"
                                  className="employee-project-link"
                                  onClick={() => open({ project: fallbackProject.id })}
                                >
                                  <FolderKanban size={15} className="muted" />
                                  <span className="person-work-title">{fallbackProject.name}</span>
                                  <span className="muted">{fallbackProject.code}</span>
                                </button>
                                <StageBadge stage={fallbackProject.stage} />
                                <Due value={fallbackProject.end_date} done={fallbackProject.stage === "done"} format={fmtDate} />
                              </div>
                            ) : (
                              <div className="employee-empty-work">
                                <CheckCircle2 size={15} className="text-success" />
                                <span className="small muted">Hozirda faol vazifalar yo'q. Xodim bo'sh</span>
                              </div>
                            )}

                            {hasMore && (
                              <button
                                type="button"
                                className="person-work-more employee-more-btn"
                                onClick={() => open({ person: p.id })}
                              >
                                {T.people.moreWork(totalTasks - 1)}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Amallar: Profilni ko'rish, Vazifa berish */}
                        <td className="people-td-actions" style={{ textAlign: "right" }}>
                          <div className="employee-table-actions">
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Eye size={14} />}
                              onClick={() => open({ person: p.id })}
                            >
                              {T.people.profileOpen}
                            </Button>
                            {p.role === "developer" && (
                              <Button
                                size="sm"
                                variant="primary"
                                icon={<Plus size={14} />}
                                disabled={p.is_on_business_trip}
                                title={p.is_on_business_trip ? T.people.tripBlocked : undefined}
                                onClick={() => open({ new: "task", assignee: p.id })}
                              >
                                {T.people.giveTask}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobil ko'rinish: EmployeeCard article ro'yxati */}
          <div className="people-grid people-mobile-grid">
            {rows.map((p) => (
              <EmployeeCard key={p.id} person={p} hasRange={hasRange} />
            ))}
          </div>
        </>
      )}

      {/* Sahifalash */}
      <Pagination
        data={peopleQuery.pagination}
        page={peopleQuery.page}
        onPageChange={peopleQuery.onPageChange}
      />

      {/* Yangi xodim qo'shish modali */}
      {createModalOpen && (
        <NewEmployeeModal
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            peopleQuery.refetch();
            statsQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
