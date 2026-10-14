import {
  CheckCircle2,
  ChevronRight,
  Eye,
  FolderKanban,
  MessageCircle,
  MoreVertical,
  Plus,
  Trophy,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useModal } from "@/app/modals";
import { fmtDate } from "@/shared/format";
import { T } from "@/shared/text";
import type { Person } from "@/shared/types";
import { Avatar, Badge, Button, Due, StageBadge, TaskStatusBadge } from "@/shared/ui";

interface EmployeeCardProps {
  person: Person;
  hasRange?: boolean;
}

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

export function EmployeeCard({ person: p, hasRange = false }: EmployeeCardProps) {
  const { open } = useModal();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Odatiy holatda bajarilgan vazifalar ko'rsatilmaydi; muddat filtri tanlangan bo'lsa — shu muddatdagi ishlar
  const rawWork = p.work ?? [];
  const displayTasks = hasRange ? rawWork : rawWork.filter((t) => t.status !== "done");

  const totalTasks = hasRange ? p.range_tasks ?? displayTasks.length : p.active_tasks;
  const visibleTasks = displayTasks.slice(0, 3);
  const hasMore = totalTasks > 1;

  const projects = p.projects ?? [];
  const activeProjects = projects.filter((prj) => prj.stage !== "done");
  const fallbackProject = displayTasks.length === 0 ? activeProjects[0] : undefined;

  function getStatusBadge(task: (typeof rawWork)[0]) {
    if (task.is_overdue) {
      return <Badge tone="danger">{T.dashboard.overdue}</Badge>;
    }
    return <TaskStatusBadge status={task.status} />;
  }

  return (
    <article className="card employee-card" key={p.id}>
      {/* ─── Karta yuqori qismi (Header) ─── */}
      <div className="employee-card-header">
        {/* Chap taraf: Avatar, ism, lavozim, bo'lim */}
        <div className="employee-header-left">
          <div className="employee-avatar-wrap">
            <Avatar user={p} />
            <span
              className={`employee-status-dot ${p.is_on_business_trip ? "trip" : "online"}`}
              title={p.is_on_business_trip ? T.people.onBusinessTrip : "Faol xodim"}
            />
          </div>
          <div className="employee-info">
            <div className="employee-name-row">
              <button
                type="button"
                className="employee-name-btn"
                onClick={() => open({ person: p.id })}
                title={T.people.profileOpen}
              >
                <strong>{p.full_name}</strong>
              </button>
              {p.is_on_business_trip && (
                <Badge tone="warning">{T.people.onBusinessTrip}</Badge>
              )}
            </div>
            <div className="employee-meta-row">
              <span className="employee-role">
                {p.department_name || p.specialty || p.role_label}
              </span>
              <span className="employee-dot-sep">•</span>
              <span className="employee-dept">
                {p.specialty ? `${p.specialty} jamoasi` : "TeamFlow"}
              </span>
            </div>
            {p.responsibilities && (
              <p className="employee-resp-text" title={p.responsibilities}>
                {p.responsibilities}
              </p>
            )}
          </div>
        </div>

        {/* O'rta qism: faol, kechikkan, circular progress */}
        <div className="employee-header-center">
          <div className="employee-stats-badge-group">
            <div className="employee-stat-pill" title="Faol vazifalar soni">
              <span className="employee-stat-pill-num">{p.active_tasks}</span>
              <span className="employee-stat-pill-label">Faol vazifa</span>
            </div>
            <div
              className={`employee-stat-pill ${p.overdue_tasks > 0 ? "danger" : "neutral"}`}
              title="Kechikkan vazifalar soni"
            >
              <span className="employee-stat-pill-num">{p.overdue_tasks}</span>
              <span className="employee-stat-pill-label">Kechikkan</span>
            </div>
          </div>
          <CircularProgress activeCount={p.active_tasks} />
        </div>

        {/* O'ng taraf: Amallar va Qo'shimcha menyu */}
        <div className="employee-header-actions">
          <Button
            size="sm"
            variant="ghost"
            icon={<Eye size={15} />}
            aria-label={T.people.profileOpen}
            onClick={() => open({ person: p.id })}
          >
            Profil
          </Button>

          {p.role === "developer" && (
            <Button
              size="sm"
              variant="primary"
              icon={<Plus size={15} />}
              disabled={p.is_on_business_trip}
              title={p.is_on_business_trip ? T.people.tripBlocked : undefined}
              onClick={() => open({ new: "task", assignee: p.id })}
            >
              {T.people.giveTask}
            </Button>
          )}

          {/* Uch nuqtali qo'shimcha menyu */}
          <div className="employee-dropdown-wrap" ref={menuRef}>
            <button
              type="button"
              className="employee-dots-btn"
              aria-label="Qo'shimcha amallar"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="employee-dropdown-menu" role="menu">
                <button
                  type="button"
                  className="employee-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    open({ person: p.id });
                  }}
                >
                  <User size={14} />
                  <span>Profilni ochish</span>
                </button>
                {p.role === "developer" && !p.is_on_business_trip && (
                  <button
                    type="button"
                    className="employee-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      open({ new: "task", assignee: p.id });
                    }}
                  >
                    <Plus size={14} />
                    <span>Vazifa biriktirish</span>
                  </button>
                )}
                <button
                  type="button"
                  className="employee-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/xabarlar");
                  }}
                >
                  <MessageCircle size={14} />
                  <span>Xabarlar (Chat)</span>
                </button>
                <button
                  type="button"
                  className="employee-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    open({ portfolio: p.id });
                  }}
                >
                  <Trophy size={14} />
                  <span>Portfolio ko'rish</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Karta pastki qismi: Vazifalar ro'yxati ─── */}
      <div className="employee-tasks-section">
        {visibleTasks.length > 0 ? (
          <div className="employee-tasks-mobile-list">
            {visibleTasks.map((t) => (
              <div key={t.id} className="employee-task-mobile-item">
                <button
                  type="button"
                  className="employee-task-link"
                  onClick={() => open({ task: t.id })}
                >
                  <span className="employee-task-title">{t.title}</span>
                </button>
                <div className="row-wrap small muted" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    type="button"
                    className="employee-project-link"
                    onClick={() => open({ project: t.project.id })}
                  >
                    <span>{t.project.code} · {t.project.name}</span>
                  </button>
                  <div className="row-wrap" style={{ gap: 6 }}>
                    {getStatusBadge(t)}
                    <Due value={t.due_at} done={false} format={fmtDate} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : fallbackProject ? (
          <div className="employee-task-mobile-item">
            <button
              type="button"
              className="employee-project-link"
              onClick={() => open({ project: fallbackProject.id })}
            >
              <FolderKanban size={15} className="muted" />
              <span className="person-work-title">{fallbackProject.name}</span>
              <span className="muted">{fallbackProject.code}</span>
            </button>
            <div className="row-wrap small muted" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <StageBadge stage={fallbackProject.stage} />
              <Due value={fallbackProject.end_date} done={fallbackProject.stage === "done"} format={fmtDate} />
            </div>
          </div>
        ) : (
          <div className="employee-empty-work">
            <CheckCircle2 size={16} className="text-success" />
            <span className="small muted">Hozirda faol vazifalar yo'q. Xodim bo'sh</span>
          </div>
        )}

        {hasMore && (
          <div className="employee-more-bar">
            <button
              type="button"
              className="person-work-more employee-more-btn"
              onClick={() => open({ person: p.id })}
            >
              <span>{T.people.moreWork(totalTasks - 1)}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
