import { AlertTriangle, CheckCircle2, ClipboardCheck, Hourglass } from "lucide-react";
import { useState } from "react";

import { useModal } from "@/app/modals";
import { usePagedList } from "@/app/queries";
import { fmtDateTime } from "@/shared/format";
import { T } from "@/shared/text";
import type { Task } from "@/shared/types";
import { Button, CodeTag, Due, Empty, ErrorBox, People, PriorityBadge, SkeletonRows, SummaryGrid, type SummaryCardItem } from "@/shared/ui";
import { Pagination } from "@/shared/ui/Pagination";

/** Tekshiruv navbati (PM/Boshliq): dasturchi yuborgan vazifalar. Bosilsa — vazifa modali tekshiruv tabida. */
export default function ReviewPage() {
  const { open } = useModal();
  const [filter, setFilter] = useState<string>("");
  const query = usePagedList<Task>(["tasks", "review"], "/tasks/", { status: "in_review" });

  const tasks = query.data ?? [];
  const urgentCount = tasks.filter((t) => t.priority === "urgent" || t.priority === "high").length;
  const onTimeCount = tasks.filter((t) => !t.is_overdue).length;

  const reviewSummary: SummaryCardItem[] = [
    { key: "", label: "Tekshiruv kutilmoqda", value: query.pagination?.count ?? tasks.length, hint: "Barcha tekshiruvlar", icon: Hourglass, tone: "violet" },
    { key: "urgent", label: "Muhim topshiriqlar", value: urgentCount, hint: "Shoshilinch va yuqori", icon: AlertTriangle, tone: "danger" },
    { key: "ontime", label: "O'z vaqtida", value: onTimeCount, hint: "Muddatidan kechikmagan", icon: CheckCircle2, tone: "success" },
  ];

  const visibleTasks = tasks.filter((t) => {
    if (filter === "urgent") return t.priority === "urgent" || t.priority === "high";
    if (filter === "ontime") return !t.is_overdue;
    return true;
  });

  return (
    <>
      <SummaryGrid
        items={reviewSummary}
        activeKey={filter}
        onSelect={(key) => setFilter(key)}
        loading={query.isLoading}
      />

      <div className="card">
        {query.error && (
          <div className="card-pad">
            <ErrorBox error={query.error} onRetry={() => query.refetch()} />
          </div>
        )}
        {query.isLoading && <SkeletonRows />}
        {!query.isLoading && !visibleTasks.length && (
          <Empty icon={<ClipboardCheck />} title={T.review.empty} hint={T.review.emptyHint} />
        )}
        {visibleTasks.map((t) => (
          <div
            key={t.id}
            className="list-row clickable"
            style={{ flexWrap: "wrap" }}
            onClick={() => open({ task: t.id })}
          >
            <div className="grow" style={{ minWidth: 240 }}>
              <div className="task-title">
                <CodeTag code={t.code} /> {t.title}
              </div>
              <div className="small muted">{t.project?.name ?? T.tasks.noProject}</div>
            </div>
            <PriorityBadge priority={t.priority} />
            <div style={{ minWidth: 160 }}>
              <People users={t.assignees} />
            </div>
            <div style={{ minWidth: 140 }}>
              <Due value={t.due_at} format={fmtDateTime} />
            </div>
            <Button variant="primary" size="sm" onClick={(e) => (e.stopPropagation(), open({ task: t.id }))}>
              {T.review.open}
            </Button>
          </div>
        ))}
      </div>
      <Pagination data={query.pagination} page={query.page} onPageChange={query.onPageChange} />
    </>
  );
}
