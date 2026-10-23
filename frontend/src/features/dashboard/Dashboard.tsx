import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Hourglass, FileText, FolderKanban, Plus, Users, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { isManager, useMe } from "@/app/auth";
import { useModal } from "@/app/modals";
import { EMPTY_FILTERS, filterParams, TaskFilters, type TaskFilterState, TaskTable } from "@/features/tasks/TaskTable";
import { api, qs } from "@/shared/api";
import { useDebounced } from "@/shared/hooks";
import { T } from "@/shared/text";
import type { Bucket, Dashboard as DashboardData, Paged, PeriodKey, Task } from "@/shared/types";
import { AnimatedNumber, Button, ErrorBox } from "@/shared/ui";
import { Pagination } from "@/shared/ui/Pagination";
import { OnboardingGuide } from "./OnboardingGuide";

interface Selection {
  bucket: Bucket;
  period?: PeriodKey;
  title: string;
}

export default function Dashboard() {
  const me = useMe();
  const manager = isManager(me);
  const { open } = useModal();
  // Bosh panelga kirganda haftalik faol vazifalar jadvali darrov ochiq turadi (foydalanuvchi yopishi mumkin).
  const [selected, setSelected] = useState<Selection | null>({ bucket: "active", period: "week", title: T.dashboard.weekActive });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/dashboard/") });
  const d = dash.data;
  const week = d?.periods?.find((period) => period.key === "week");
  const year = d?.periods?.find((period) => period.key === "year");

  const pick = (s: Selection) =>
    setSelected((cur) => {
      // "Shu hafta" dashboard ochilganda asosiy tanlov bo'lib qoladi.
      // Jadvalni yopish kerak bo'lsa, pastdagi alohida "Yopish" tugmasi ishlatiladi.
      if (s.bucket === "active" && s.period === "week" && cur?.bucket === s.bucket && cur.period === s.period) return cur;
      return cur && cur.bucket === s.bucket && cur.period === s.period ? null : s;
    });
  const isOn = (bucket: Bucket, period?: PeriodKey) => selected?.bucket === bucket && selected?.period === period;

  return (
    <div className="dashboard-page">
      <div className="page-toolbar">
        <div className="page-actions">
          {manager ? (
            <>
              <Link to="/xodimlar" className="btn">
                <Users size={16} /> {T.nav.people}
              </Link>
              {(d?.orders_pending ?? 0) > 0 && (
                <Link to="/buyurtmalar" className="btn">
                  <FileText size={16} /> {T.nav.orders}
                  <span className="count-pill">{d?.orders_pending}</span>
                </Link>
              )}
              <Button icon={<FolderKanban />} onClick={() => open({ new: "project" })}>
                {T.projects.new}
              </Button>
              <Button variant="primary" icon={<Plus />} onClick={() => open({ new: "task" })}>
                {T.tasks.new}
              </Button>
            </>
          ) : (
            <Link to="/mening-ishim" className="btn btn-primary">
              {T.nav.myWork}
            </Link>
          )}
        </div>
      </div>

      <OnboardingGuide />

      {dash.error && <ErrorBox error={dash.error} onRetry={() => dash.refetch()} />}

      <section className="dashboard-summary-grid" aria-label="Bosh panel statistikasi">
        {[
          { label: "Jami", value: year ? year.counts.active + year.counts.overdue + year.counts.done : null, hint: "Barcha vazifalar", tone: "violet" },
          { label: "Faol", value: week?.counts.active ?? null, hint: "Ish ketmoqda", tone: "slate" },
          { label: "Muddati o'tgan", value: week?.counts.overdue ?? null, hint: "E'tibor talab qiladi", tone: "red" },
          { label: "Tekshiruvda", value: d?.totals.review ?? null, hint: "Tasdiqlash kutilmoqda", tone: "purple" },
          { label: "Yakunlangan", value: year?.counts.done ?? null, hint: "Muvaffaqiyatli tugagan", tone: "green" },
        ].map((item) => (
          <div key={item.label} className="card dashboard-summary-card">
            <span className={`dashboard-summary-icon tone-${item.tone}`} aria-hidden />
            <div className="dashboard-summary-copy">
              <span>{item.label}</span>
              <strong>{item.value ?? "—"}</strong>
              <small>{item.hint}</small>
            </div>
          </div>
        ))}
      </section>

      <section className="card dashboard-filter-card" aria-label="Vazifalar filtri">
        <div className="dashboard-filter-chips">
          {[
            { bucket: "active" as const, label: "Faol", value: week?.counts.active ?? 0 },
            { bucket: "overdue" as const, label: "Muddati o'tgan", value: week?.counts.overdue ?? 0 },
            { bucket: "done" as const, label: "Bajarilgan", value: week?.counts.done ?? 0 },
            { bucket: "review" as const, label: "Tekshiruv kutilmoqda", value: d?.totals.review ?? 0 },
          ].map((item) => (
            <button key={item.bucket} type="button" className={`dashboard-filter-chip ${isOn(item.bucket, "week") || (item.bucket === "review" && isOn("review")) ? "selected" : ""}`}
              onClick={() => pick({ bucket: item.bucket, period: item.bucket === "review" ? undefined : "week", title: item.label })}>
              <span>{item.label}</span><b>{item.value}</b>
            </button>
          ))}
        </div>
      </section>

      <div className="grid-3">
        {(
          [
            { bucket: "late", label: T.dashboard.late, icon: Clock, tone: "danger" },
            { bucket: "overdue", label: T.dashboard.overdue, icon: AlertTriangle, tone: "danger" },
            { bucket: "review", label: T.dashboard.review, icon: Hourglass, tone: "primary" },
          ] as const
        ).map((c) => (
          <button key={c.bucket} className="card total clickable" aria-pressed={isOn(c.bucket)} onClick={() => pick({ bucket: c.bucket, title: c.label })}>
            <span className={`total-icon tone-${c.tone}`}>
              <c.icon size={20} />
            </span>
            <span className="grow">
              <span className="stat-label">
                {c.label}
              </span>
              <span className="stat-num">{d ? <AnimatedNumber value={d.totals[c.bucket]} /> : "—"}</span>
            </span>
            <ChevronRight size={18} className="muted" />
          </button>
        ))}
      </div>

      {selected && (
        <SelectedTasks key={`${selected.bucket}:${selected.period ?? "all"}`} selection={selected}
          onClose={() => setSelected(null)} manager={manager} mine={!manager} />
      )}
    </div>
  );
}

function SelectedTasks({ selection, onClose, manager, mine }: { selection: Selection; onClose: () => void; manager: boolean; mine: boolean }) {
  const [filters, setFilters] = useState<TaskFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const debounced = useDebounced(filters);
  const query = useQuery({
    queryKey: ["tasks", "dashboard", selection.bucket, selection.period, debounced, mine, page],
    queryFn: () =>
      api.get<Paged<Task>>(`/tasks/${qs({ bucket: selection.bucket, period: selection.period, mine: mine ? 1 : undefined,
        ...filterParams(debounced), page: page === 1 ? undefined : page })}`),
    placeholderData: keepPreviousData,
  });
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="grow">
          {selection.title} {query.data && <span className="count-pill soft">{query.data.count}</span>}
        </h3>
        <Button size="sm" onClick={onClose}>
          {T.common.close}
        </Button>
      </div>
      <TaskFilters value={filters} onChange={(value) => { setFilters(value); setPage(1); }} showPerson={manager} showStatus={selection.bucket === "active" || selection.bucket === "overdue"} />
      {query.error ? (
        <div className="card-pad">
          <ErrorBox error={query.error} />
        </div>
      ) : (
        <TaskTable tasks={query.data?.results} loading={query.isLoading} />
      )}
      <Pagination data={query.isPlaceholderData ? undefined : query.data} page={page} onPageChange={setPage} />
    </div>
  );
}
