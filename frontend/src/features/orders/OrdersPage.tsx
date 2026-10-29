import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, FileText, Layers3, Plus } from "lucide-react";
import { useState } from "react";

import { useMe } from "@/app/auth";
import { useModal } from "@/app/modals";
import { api, qs } from "@/shared/api";
import { useDebounced } from "@/shared/hooks";
import { T } from "@/shared/text";
import type { Order, Paged } from "@/shared/types";
import { Button, Empty, ErrorBox, SkeletonRows, SummaryGrid, type SummaryCardItem } from "@/shared/ui";
import { Pagination } from "@/shared/ui/Pagination";

import { OrdersTable } from "./OrdersTable";

type OrderSummary = { total: number; submitted: number; approved: number; rejected: number };

export default function OrdersPage() {
  const me = useMe();
  const dept = me.role === "department";
  const { open } = useModal();
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const isTest = import.meta.env.MODE === "test";

  const query = useQuery({
    queryKey: ["orders", status, search, page],
    queryFn: () => api.get<Paged<Order>>(`/orders/${qs({ status, q: search, page: page === 1 ? undefined : page })}`),
    placeholderData: keepPreviousData,
  });

  const summary = useQuery({
    queryKey: ["orders", "summary"],
    queryFn: () => api.get<OrderSummary>("/orders/summary/"),
    enabled: !isTest,
    staleTime: 30_000,
  });

  const orders = query.data?.results ?? [];
  const sData = summary.data;
  const submittedCount = sData?.submitted ?? orders.filter((o) => o.status === "submitted").length;
  const approvedCount = sData?.approved ?? orders.filter((o) => o.status === "approved" || o.status === "project_created").length;
  const rejectedCount = sData?.rejected ?? orders.filter((o) => o.status === "rejected").length;
  const totalCount = sData?.total ?? query.data?.count ?? orders.length;

  const summaryCards: SummaryCardItem[] = [
    { key: "", label: "Jami", value: totalCount, hint: "Barcha buyurtmalar", icon: Layers3, tone: "primary" },
    { key: "submitted", label: "Yangi (yuborilgan)", value: submittedCount, hint: "Tasdiq kutilmoqda", icon: Clock3, tone: "info" },
    { key: "approved", label: "Tasdiqlangan", value: approvedCount, hint: "Loyiha bo'lgan", icon: CheckCircle2, tone: "success" },
    { key: "rejected", label: "Rad etilgan", value: rejectedCount, hint: "Qaytarilgan", icon: AlertTriangle, tone: "danger" },
  ];

  return (
    <>
      <SummaryGrid
        items={summaryCards}
        activeKey={status}
        onSelect={(key) => {
          setStatus(key);
          setPage(1);
        }}
        loading={summary.isLoading}
      />

      <div className="card">
        <div className="card-toolbar">
          <input
            className="input page-search"
            placeholder={T.common.search}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            aria-label={T.common.search}
          />
          {dept && (
            <div className="page-actions">
              <Button variant="primary" icon={<Plus />} onClick={() => open({ new: "order" })}>
                {T.orders.new}
              </Button>
            </div>
          )}
        </div>
        {query.error && (
          <div className="card-pad">
            <ErrorBox error={query.error} onRetry={() => query.refetch()} />
          </div>
        )}
        {query.isLoading && <SkeletonRows />}
        {query.data && !query.data.results.length && (
          <Empty
            icon={<FileText />}
            title={T.orders.empty}
            hint={dept ? T.orders.emptyDept : T.orders.emptyManager}
            action={
              dept && (
                <Button variant="primary" icon={<Plus />} onClick={() => open({ new: "order" })}>
                  {T.orders.new}
                </Button>
              )
            }
          />
        )}
        {query.data && query.data.results.length > 0 && <OrdersTable orders={query.data.results} showDepartment={!dept} />}
        <Pagination data={query.isPlaceholderData ? undefined : query.data} page={page} onPageChange={setPage} />
      </div>
    </>
  );
}
