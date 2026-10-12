import { useQuery } from "@tanstack/react-query";
import { Search, Star, UserCheck, Users } from "lucide-react";
import { useState } from "react";

import { useModal } from "@/app/modals";
import { usePagedList } from "@/app/queries";
import { api } from "@/shared/api";
import { useDebounced } from "@/shared/hooks";
import { T } from "@/shared/text";
import type { PortfolioDeveloper, PortfolioSummary } from "@/shared/types";
import { Avatar, Button, Empty, ErrorBox, SkeletonRows } from "@/shared/ui";
import { Pagination } from "@/shared/ui/Pagination";

const HINT_KEY = "user-how-seen";
type SortKey = keyof typeof T.user.sort;
/** "all" · "following" · `s:<mutaxassislik id>` */
type Chip = string;

function readSeen() {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function HowItWorks({ onClose }: { onClose: () => void }) {
  return (
    <section className="card uhow" aria-label={T.user.howTitle}>
      <b>{T.user.howTitle}</b>
      <ol>
        {T.user.howSteps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <Button size="sm" onClick={onClose}>{T.user.howClose}</Button>
    </section>
  );
}

function StatCard({ value, label, star }: { value: string | number; label: string; star?: boolean }) {
  return (
    <div className="card ustat">
      <b className="ustat-value">{value}{star && <Star size={22} className="ustar" aria-hidden />}</b>
      <span className="muted">{label}</span>
    </div>
  );
}

function DeveloperCard({ d }: { d: PortfolioDeveloper }) {
  const { open } = useModal();
  return (
    <article className="card ucard">
      <Avatar user={d} size="lg" />
      <div className="ucard-body">
        <div className="ucard-name">
          <b className="ellipsis">{d.full_name}</b>
          {d.is_following && <UserCheck size={16} className="ucard-following" aria-label={T.portfolio.following} />}
        </div>
        <span className="muted ellipsis">{d.specialty || T.portfolio.developer}</span>
        <div className="ucard-foot">
          <span className="ucard-rating">
            {d.rating === null ? (
              <span className="muted">{T.portfolio.noRating}</span>
            ) : (
              <>
                <Star size={16} className="ustar" aria-hidden />
                <b>{d.rating.toFixed(1)}</b>
                <span className="muted">{T.user.ratingLine(d.reviews_count, d.projects_count)}</span>
              </>
            )}
          </span>
          <button type="button" className="uview" onClick={() => open({ portfolio: d.id })}>{T.user.viewProfile}</button>
        </div>
      </div>
    </article>
  );
}

/** Oddiy foydalanuvchi bosh sahifasi: sarlavha, qidiruv, saralash, umumiy ko'rsatkichlar, chiplar va kartalar. */
export default function UserDashboard() {
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<Chip>("all");
  const [sort, setSort] = useState<SortKey>("rating");
  const [seen, setSeen] = useState(readSeen);
  const search = useDebounced(q.trim());
  const summary = useQuery({ queryKey: ["portfolio", "summary"], queryFn: () => api.get<PortfolioSummary>("/portfolio/summary/") });
  const list = usePagedList<PortfolioDeveloper>(["portfolio", "list", search, chip, sort], "/portfolio/", {
    q: search,
    following: chip === "following" ? 1 : undefined,
    specialty: chip.startsWith("s:") ? Number(chip.slice(2)) : undefined,
    sort: sort === "rating" ? undefined : sort,
  });
  const rows = list.data ?? [];
  const stats = summary.data;

  const closeHint = () => {
    setSeen(true);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* brauzer xotirasi yopiq bo'lishi mumkin */
    }
  };

  const chips: { key: Chip; label: string }[] = [
    { key: "all", label: T.user.filterAll },
    { key: "following", label: T.user.filterFollowing },
    ...(stats?.specialties ?? []).map((s) => ({ key: `s:${s.id}`, label: s.name })),
  ];

  return (
    <div className="stack">
      <div className="uhead">
        <h1 className="uhead-title">{T.user.title}</h1>
        <label className="people-search uhead-search">
          <Search size={18} className="muted" aria-hidden />
          <input type="search" placeholder={T.user.searchPh} aria-label={T.user.searchPh} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input usort" aria-label={T.user.sortLabel} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          {(Object.keys(T.user.sort) as SortKey[]).map((key) => <option key={key} value={key}>{T.user.sort[key]}</option>)}
        </select>
      </div>

      {!seen && <HowItWorks onClose={closeHint} />}

      <div className="ustats">
        <StatCard value={stats ? stats.developers : "–"} label={T.user.statDevelopers} />
        <StatCard value={stats?.average_rating != null ? stats.average_rating.toFixed(1) : "–"} label={T.user.statRating} star={stats?.average_rating != null} />
        <StatCard value={stats ? stats.rated_projects : "–"} label={T.user.statRated} />
      </div>

      <div className="uchips" role="group" aria-label={T.user.filterLabel}>
        {chips.map((c) => (
          <button key={c.key} type="button" className="uchip" aria-pressed={chip === c.key} onClick={() => setChip(c.key)}>{c.label}</button>
        ))}
      </div>

      {list.error && <ErrorBox error={list.error} onRetry={() => list.refetch()} />}
      {list.isLoading && <div className="card"><SkeletonRows rows={4} /></div>}
      {list.data && !rows.length && (
        <div className="card">
          {chip === "following" && !search ? (
            <Empty icon={<UserCheck />} title={T.user.emptyFollowing} hint={T.user.emptyFollowingHint}
              action={<Button variant="primary" onClick={() => setChip("all")}>{T.user.showAll}</Button>} />
          ) : (
            <Empty icon={<Users />} title={T.portfolio.empty} hint={T.portfolio.emptyHint} />
          )}
        </div>
      )}
      <div className="ugrid">
        {rows.map((d) => <DeveloperCard key={d.id} d={d} />)}
      </div>
      <Pagination data={list.pagination} page={list.page} onPageChange={list.onPageChange} />
    </div>
  );
}
