import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Clock3, FolderKanban, Hourglass, Layers3, Play, Plus } from "lucide-react";
import { useState } from "react";

import { isManager, useMe } from "@/app/auth";
import { useModal } from "@/app/modals";
import { api, qs } from "@/shared/api";
import { fmtDate } from "@/shared/format";
import { useDebounced } from "@/shared/hooks";
import { useMeta } from "@/shared/meta";
import { T } from "@/shared/text";
import type { Paged, Project, ProjectStage } from "@/shared/types";
import { Badge, Button, CodeTag, Empty, ErrorBox, People, Skeleton, StageBadge } from "@/shared/ui";
import { Pagination } from "@/shared/ui/Pagination";

type ProjectSummary = { total: number; stages: Record<ProjectStage, number> };

export default function ProjectsPage() {
  const me = useMe();
  const manager = isManager(me);
  const { open } = useModal();
  const meta = useMeta();
  const [stage, setStage] = useState<"" | ProjectStage>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const query = useQuery({
    queryKey: ["projects", stage, search, page],
    queryFn: () => api.get<Paged<Project>>(`/projects/${qs({ stage, q: search, page: page === 1 ? undefined : page })}`),
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({
    queryKey: ["projects", "summary"],
    queryFn: () => api.get<ProjectSummary>("/projects/summary/"),
    staleTime: 30_000,
  });

  const summaryCards = [
    { key: "total", label: "Jami", value: summary.data?.total ?? 0, hint: "Barcha loyihalar", icon: Layers3, tone: "primary" },
    { key: "planned", label: "Rejalashtirilgan", value: summary.data?.stages.planned ?? 0, hint: "Hali boshlanmagan", icon: Clock3, tone: "slate" },
    { key: "started", label: "Boshlangan", value: summary.data?.stages.started ?? 0, hint: "Ish ketmoqda", icon: Play, tone: "info" },
    { key: "pending", label: "Tasdiq kutilmoqda", value: summary.data?.stages.pending_approval ?? 0, hint: "Yakunlash tasdig'i kerak", icon: Hourglass, tone: "violet" },
    { key: "done", label: "Yakunlangan", value: summary.data?.stages.done ?? 0, hint: "Muvaffaqiyatli yakunlangan", icon: CheckCircle2, tone: "success" },
  ] as const;

  return (
    <>
      <section className="project-summary-grid" aria-label="Loyiha statistikasi">
        {summaryCards.map((item) => (
          <article key={item.key} className="card project-summary-card">
            <span className={`project-summary-icon tone-${item.tone}`}><item.icon size={20} /></span>
            <span className="project-summary-copy">
              <span className="project-summary-label">{item.label}</span>
              <strong>{summary.isLoading ? "—" : item.value}</strong>
              <small>{item.hint}</small>
            </span>
            <span className={`project-summary-spark tone-${item.tone}`} aria-hidden>
              <i /><i /><i /><i /><i />
            </span>
          </article>
        ))}
      </section>

      <section className="card project-filters-card" aria-label="Loyihalarni filtrlash">
        <div className="chips project-filter-chips">
          <button className="chip" aria-pressed={stage === ""} onClick={() => { setStage(""); setPage(1); }}>
            <Layers3 size={15} /> {T.common.all} <b>{summary.data?.total ?? "—"}</b>
          </button>
          {meta.options<ProjectStage>("project_stages").map((s) => (
            <button key={s.value} className="chip" aria-pressed={stage === s.value} onClick={() => { setStage(s.value); setPage(1); }}>
              {s.label} <b>{summary.data?.stages[s.value] ?? "—"}</b>
            </button>
          ))}
        </div>
        <div className="project-filter-row">
          <input className="input page-search" placeholder="Loyiha nomi yoki raqami..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label={T.common.search} />
          {manager && <Button variant="primary" icon={<Plus />} onClick={() => open({ new: "project" })}>{T.projects.new}</Button>}
        </div>
      </section>
      {query.error && <ErrorBox error={query.error} onRetry={() => query.refetch()} />}
      {query.isLoading && (
        <div className="project-grid">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={170} />
          ))}
        </div>
      )}
      {query.data && !query.data.results.length && (
        <div className="card">
          <Empty
            icon={<FolderKanban />}
            title={T.projects.empty}
            hint={manager ? T.projects.emptyHint : T.projects.emptyDev}
            action={
              manager && (
                <Button variant="primary" icon={<Plus />} onClick={() => open({ new: "project" })}>
                  {T.projects.new}
                </Button>
              )
            }
          />
        </div>
      )}
      <div className="project-grid">
        {query.data?.results.map((p) => {
          const pct = p.progress.total ? Math.round((p.progress.done / p.progress.total) * 100) : 0;
          return (
            <button key={p.id} className="card project-card clickable" onClick={() => open({ project: p.id })}>
              <div className="row">
                <StageBadge stage={p.stage} />
                {p.order_id && (
                  <Badge tone="slate" dot={false}>
                    {T.projects.fromOrder}
                  </Badge>
                )}
              </div>
              <h3>
                <CodeTag code={p.code} /> {p.name}
              </h3>
              <div className="stack-sm" style={{ gap: 4 }}>
                <div className="progress">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <span className="small muted">{T.projects.progress(p.progress.done, p.progress.total)}</span>
              </div>
              <div className="row">
                <People users={p.members} />
                <span className="spacer" />
                <span className="row small muted" style={{ gap: 4 }}>
                  <CalendarDays size={14} /> {fmtDate(p.end_date)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <Pagination data={query.isPlaceholderData ? undefined : query.data} page={page} onPageChange={setPage} />
    </>
  );
}
