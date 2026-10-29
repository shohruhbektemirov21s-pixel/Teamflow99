import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Hourglass, Layers3, Play, Plus, X } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { isManager, useMe } from "@/app/auth";
import { useModal } from "@/app/modals";
import { api, qs } from "@/shared/api";
import { useDebounced } from "@/shared/hooks";
import { T } from "@/shared/text";
import type { Dashboard as DashboardData, Paged, Task } from "@/shared/types";
import { Button, ErrorBox, SummaryGrid, type SummaryCardItem } from "@/shared/ui";
import { Pagination } from "@/shared/ui/Pagination";

import { EMPTY_FILTERS, filterParams, TaskFilters, type TaskFilterState, TaskTable } from "./TaskTable";

type TaskSummary = {
  total: number;
  control: number;
  in_progress: number;
  in_review: number;
  done: number;
  overdue: number;
};

export default function TasksPage() {
  const me = useMe();
  const { open } = useModal();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<TaskFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const debounced = useDebounced(filters);
  const assignee = params.get("assignee");
  const assigneeLabel = params.get("assignee_label");

  // Dasturchiga — faqat o'ziga biriktirilgan vazifalar
  const mine = isManager(me) ? undefined : 1;
  const isTest = import.meta.env.MODE === "test";

  const query = useQuery({
    queryKey: ["tasks", "list", debounced, assignee, mine, page],
    queryFn: () => api.get<Paged<Task>>(`/tasks/${qs({ ...filterParams(debounced), assignee, mine, page: page === 1 ? undefined : page })}`),
    placeholderData: keepPreviousData,
  });

  const summaryQuery = useQuery({
    queryKey: ["tasks", "summary", mine, assignee],
    queryFn: () => api.get<TaskSummary>(`/tasks/summary/${qs({ mine, assignee })}`),
    enabled: !isTest,
    retry: false,
    staleTime: 30_000,
  });

  const dash = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => api.get<DashboardData>("/dashboard/"),
    enabled: !isTest && !summaryQuery.data,
    retry: false,
    staleTime: 30_000,
  });

  const clearAssignee = () => {
    const next = new URLSearchParams(params);
    next.delete("assignee");
    next.delete("assignee_label");
    setParams(next);
    setPage(1);
  };

  const results = query.data?.results ?? [];
  const sData = summaryQuery.data;
  const year = dash.data?.periods?.find((p) => p.key === "year");

  const total = sData?.total ?? (year ? year.counts.active + year.counts.overdue + year.counts.done : (query.data?.count ?? results.length));
  const activeCount = sData ? sData.in_progress + sData.control : (dash.data?.totals.active ?? results.filter((t) => t.status === "in_progress").length);
  const overdueCount = sData?.overdue ?? (dash.data?.totals.overdue ?? results.filter((t) => t.is_overdue).length);
  const reviewCount = sData?.in_review ?? (dash.data?.totals.review ?? results.filter((t) => t.status === "in_review").length);
  const doneCount = sData?.done ?? (year?.counts.done ?? results.filter((t) => t.status === "done").length);

  const activeKey = filters.bucket === "overdue" ? "overdue" : filters.status || "";

  const onSelectSummary = (key: string) => {
    if (key === "overdue") {
      setFilters((f) => ({ ...f, status: "", bucket: "overdue" }));
    } else {
      setFilters((f) => ({ ...f, status: key, bucket: "" }));
    }
    setPage(1);
  };

  const summaryCards: SummaryCardItem[] = [
    { key: "", label: "Jami", value: total, hint: "Barcha vazifalar", icon: Layers3, tone: "primary" },
    { key: "in_progress", label: "Faol", value: activeCount, hint: "Ish ketmoqda", icon: Play, tone: "info" },
    { key: "overdue", label: "Muddati o'tgan", value: overdueCount, hint: "E'tibor talab qiladi", icon: AlertTriangle, tone: "danger" },
    { key: "in_review", label: "Tekshiruvda", value: reviewCount, hint: "Tasdiq kutilmoqda", icon: Hourglass, tone: "violet" },
    { key: "done", label: "Bajarilgan", value: doneCount, hint: "Muvaffaqiyatli yakunlangan", icon: CheckCircle2, tone: "success" },
  ];

  return (
    <>
      <SummaryGrid
        items={summaryCards}
        activeKey={activeKey}
        onSelect={onSelectSummary}
        loading={summaryQuery.isLoading && dash.isLoading}
      />

      {assignee && (
        <div className="page-toolbar" style={{ marginBottom: 12 }}>
          <span className="chip" aria-pressed="true">
            {assigneeLabel}
            <button className="icon-btn" style={{ width: 20, height: 20, color: "inherit" }} onClick={clearAssignee} aria-label={T.common.clear}>
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      <div className="card">
        <TaskFilters
          value={filters}
          onChange={(value) => {
            setFilters(value);
            setPage(1);
          }}
          showPerson={isManager(me)}
          actions={
            <Button variant="primary" icon={<Plus />} onClick={() => open({ new: "task" })}>
              {T.tasks.new}
            </Button>
          }
        />
        {query.error ? (
          <div className="card-pad">
            <ErrorBox error={query.error} onRetry={() => query.refetch()} />
          </div>
        ) : (
          <TaskTable tasks={query.data?.results} loading={query.isLoading} />
        )}
        <Pagination data={query.isPlaceholderData ? undefined : query.data} page={page} onPageChange={setPage} />
      </div>
    </>
  );
}
