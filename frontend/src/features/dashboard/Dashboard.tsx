import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock, Hourglass, ChevronRight } from "lucide-react";
import { useState } from "react";

import { isManager, useMe } from "@/app/auth";
import { EMPTY_FILTERS, filterParams, TaskFilters, type TaskFilterState, TaskTable } from "@/features/tasks/TaskTable";
import { api, qs } from "@/shared/api";
import { useDebounced } from "@/shared/hooks";
import { T } from "@/shared/text";
import type { Bucket, Dashboard as DashboardData, Paged, PeriodKey, Task } from "@/shared/types";
import { AnimatedNumber, Button, ErrorBox } from "@/shared/ui";
import { Pagination } from "@/shared/ui/Pagination";
import { PeriodCards } from "./PeriodCards";

const PERIOD_BUCKETS: { key: "active" | "overdue" | "done"; label: string; alert?: boolean }[] = [
  { key: "active", label: T.dashboard.active },
  { key: "overdue", label: T.dashboard.overdue, alert: true },
  { key: "done", label: T.dashboard.done },
];

interface Selection {
  bucket: Bucket;
  period?: PeriodKey;
  title: string;
}

export default function Dashboard() {
  const me = useMe();
  const manager = isManager(me);
  // Bosh panelga kirganda haftalik faol vazifalar jadvali darrov ochiq turadi (foydalanuvchi yopishi mumkin).
  const [selected, setSelected] = useState<Selection | null>({ bucket: "active", period: "week", title: T.dashboard.weekActive });
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardData>("/dashboard/") });
  const d = dash.data;

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
      {dash.error && <ErrorBox error={dash.error} onRetry={() => dash.refetch()} />}

      <PeriodCards
        periods={d?.periods}
        buckets={PERIOD_BUCKETS}
        isOn={isOn}
        onPick={(bucket, period, title) => pick({ bucket, period, title })}
      />

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
      api.get<Paged<Task>>(`/tasks/${qs({
        ...filterParams(debounced),
        bucket: selection.bucket,
        period: selection.period,
        mine: mine ? 1 : undefined,
        page: page === 1 ? undefined : page,
      })}`),
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
