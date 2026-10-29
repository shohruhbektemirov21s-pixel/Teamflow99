import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Hourglass, Play, Send, Sparkles } from "lucide-react";

import { useModal } from "@/app/modals";
import { T } from "@/shared/text";
import { Avatar, Badge, SummaryGrid, type SummaryCardItem } from "@/shared/ui";

export interface ProfileStats {
  active: number;
  overdue: number;
  review: number;
  done: number;
}

/**
 * Profil sarlavhasi — o'z profilim (`/profil`) va xodim oynasida (PersonModal) bir xil ko'rinish:
 * avatar, ism, lavozim/bo'lim va (dasturchi bo'lsa) 4 ta KPI ko'rsatkichli karta sparklinelar bilan.
 */
export function ProfileHeader({
  user,
  subtitle,
  stats,
  actions,
  activeKey,
  onSelect,
}: {
  user: { id: number; full_name: string; avatar?: string | null; telegram_username?: string };
  subtitle: string;
  stats?: ProfileStats | null;
  actions?: ReactNode;
  activeKey?: string;
  onSelect?: (key: string) => void;
}) {
  const { open } = useModal();
  const avatar = user.avatar;

  const summaryItems: SummaryCardItem[] | null = stats
    ? [
        {
          key: "in_progress",
          label: T.dashboard.active,
          value: stats.active,
          hint: "Jarayondagi ishlar",
          icon: Play,
          tone: "info",
        },
        {
          key: "overdue",
          label: T.dashboard.overdue,
          value: stats.overdue,
          hint: "E'tibor talab qiladi",
          icon: AlertTriangle,
          tone: "danger",
        },
        {
          key: "in_review",
          label: T.dashboard.review,
          value: stats.review,
          hint: "Tasdiqlash kutilmoqda",
          icon: Hourglass,
          tone: "violet",
        },
        {
          key: "done",
          label: T.dashboard.done,
          value: stats.done,
          hint: "Muvaffaqiyatli yakunlangan",
          icon: CheckCircle2,
          tone: "success",
        },
      ]
    : null;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="profile-hero-card">
        <div className="profile-hero-left">
          {avatar ? (
            <button
              type="button"
              className="avatar-btn"
              aria-label={T.people.photoOpen}
              onClick={() => open({ photo: user.id, name: user.full_name, src: avatar })}
            >
              <Avatar user={user} size="lg" clickable={false} />
            </button>
          ) : (
            <Avatar user={user} size="lg" clickable={false} />
          )}
          <div className="profile-hero-info">
            <h2 className="profile-hero-name" style={{ margin: 0 }}>
              {user.full_name}
            </h2>
            <div className="profile-hero-meta">
              <span className="badge-specialty">
                <Sparkles size={13} /> {subtitle}
              </span>
              {user.telegram_username && (
                <a
                  href={`https://t.me/${user.telegram_username.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="badge-specialty"
                  style={{
                    background: "rgba(2, 132, 199, 0.12)",
                    color: "#0284c7",
                    borderColor: "rgba(2, 132, 199, 0.3)",
                    textDecoration: "none",
                    fontWeight: 650,
                  }}
                  title="Telegram'da yozish"
                >
                  <Send size={12} /> {user.telegram_username}
                </a>
              )}
            </div>
            {actions && <div className="row-wrap" style={{ marginTop: 6 }}>{actions}</div>}
          </div>
        </div>
        {stats && (
          <div className="row-wrap" aria-label={T.profile.stats}>
            <Badge tone="info">{T.people.activeN(stats.active)}</Badge>
            <Badge tone="danger">{T.people.overdueN(stats.overdue)}</Badge>
            <Badge tone="violet">{T.people.reviewN(stats.review)}</Badge>
            <Badge tone="success">{T.people.doneN(stats.done)}</Badge>
          </div>
        )}
      </div>

      {summaryItems && (
        <SummaryGrid
          items={summaryItems}
          activeKey={activeKey}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
