import { useMutation } from "@tanstack/react-query";
import { FolderKanban, MessageSquare, Search, Star, UserCheck, UserPlus, Users } from "lucide-react";
import { useState } from "react";

import { useModal } from "@/app/modals";
import { usePagedList, useRefresh } from "@/app/queries";
import { api } from "@/shared/api";
import { useDebounced } from "@/shared/hooks";
import { T } from "@/shared/text";
import type { PortfolioDeveloper } from "@/shared/types";
import { Avatar, Button, Empty, ErrorBox, Segmented, SkeletonRows, useToast } from "@/shared/ui";
import { Pagination } from "@/shared/ui/Pagination";

import { Stars } from "../portfolio/Stars";

const HINT_KEY = "user-how-seen";

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

function DeveloperCard({ d }: { d: PortfolioDeveloper }) {
  const { open } = useModal();
  const toast = useToast();
  const refresh = useRefresh(["portfolio"]);
  const follow = useMutation({
    mutationFn: (on: boolean) => (on ? api.post(`/portfolio/${d.id}/follow/`) : api.del(`/portfolio/${d.id}/follow/`)),
    onSuccess: (_r, on) => {
      toast(on ? T.portfolio.followedToast : T.portfolio.unfollowedToast);
      refresh();
    },
  });

  return (
    <article className="card ucard">
      <div className="row ucard-head">
        <Avatar user={d} />
        <div className="grow" style={{ minWidth: 0 }}>
          <b className="ellipsis" style={{ display: "block" }}>{d.full_name}</b>
          <span className="small muted ellipsis" style={{ display: "block" }}>{d.specialty || T.portfolio.developer}</span>
        </div>
        {d.rank !== null && (
          <span className={`rank-pill ${d.rank <= 3 ? `top top-${d.rank}` : ""}`} aria-label={T.portfolio.rank(d.rank)}>{d.rank}</span>
        )}
      </div>
      <Stars value={d.rating} />
      <div className="row-wrap small muted ucard-stats">
        <span className="row"><FolderKanban size={14} aria-hidden /> {T.portfolio.projectsN(d.projects_count)}</span>
        <span className="row"><MessageSquare size={14} aria-hidden /> {T.portfolio.reviewsN(d.reviews_count)}</span>
        <span className="row"><Users size={14} aria-hidden /> {T.portfolio.followersN(d.followers_count)}</span>
      </div>
      <div className="ucard-actions">
        <Button variant="primary" icon={<Star size={16} />} onClick={() => open({ portfolio: d.id })}>{T.user.view}</Button>
        <Button
          icon={d.is_following ? <UserCheck size={16} /> : <UserPlus size={16} />}
          loading={follow.isPending}
          onClick={() => follow.mutate(!d.is_following)}
        >
          {d.is_following ? T.portfolio.following : T.portfolio.follow}
        </Button>
      </div>
    </article>
  );
}

/** Oddiy foydalanuvchi bosh sahifasi: qidirish, "Hammasi / Kuzatayotganlarim" va dasturchilar kartalari. */
export default function UserDashboard() {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "following">("all");
  const [seen, setSeen] = useState(readSeen);
  const search = useDebounced(q.trim());
  const list = usePagedList<PortfolioDeveloper>(["portfolio", "list", search, only], "/portfolio/",
    { q: search, following: only === "following" ? 1 : undefined });
  const rows = list.data ?? [];

  const closeHint = () => {
    setSeen(true);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* brauzer xotirasi yopiq bo'lishi mumkin */
    }
  };

  return (
    <div className="stack">
      {!seen && <HowItWorks onClose={closeHint} />}
      <label className="people-search">
        <Search size={18} className="muted" aria-hidden />
        <input type="search" placeholder={T.portfolio.searchPh} aria-label={T.portfolio.searchPh} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <Segmented
        label={T.user.filterLabel}
        value={only}
        onChange={setOnly}
        options={[{ value: "all", label: T.user.filterAll }, { value: "following", label: T.user.filterFollowing }]}
      />

      {list.error && <ErrorBox error={list.error} onRetry={() => list.refetch()} />}
      {list.isLoading && <div className="card"><SkeletonRows rows={4} /></div>}
      {list.data && !rows.length && (
        <div className="card">
          {only === "following" && !search ? (
            <Empty icon={<UserCheck />} title={T.user.emptyFollowing} hint={T.user.emptyFollowingHint}
              action={<Button variant="primary" onClick={() => setOnly("all")}>{T.user.showAll}</Button>} />
          ) : (
            <Empty icon={<Users />} title={T.portfolio.empty} hint={T.portfolio.emptyHint} />
          )}
        </div>
      )}
      {rows.map((d) => <DeveloperCard key={d.id} d={d} />)}
      <Pagination data={list.pagination} page={list.page} onPageChange={list.onPageChange} />
    </div>
  );
}
