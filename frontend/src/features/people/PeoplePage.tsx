import { CalendarDays, Plus, Search, User, Users, X } from "lucide-react";
import { useState } from "react";

import { useMe } from "@/app/auth";
import { useModal } from "@/app/modals";
import { usePagedList } from "@/app/queries";
import { useDebounced } from "@/shared/hooks";
import { useMeta } from "@/shared/meta";
import { T } from "@/shared/text";
import type { Person } from "@/shared/types";
import { Avatar, Badge, Button, Empty, ErrorBox, SkeletonRows } from "@/shared/ui";
import { Pagination } from "@/shared/ui/Pagination";

import { PersonWork } from "./PersonWork";

/** Xodimlar: sarlavha, filtr kartasi (qidiruv, vazifa muddati, rol — Boshliqda, bo'shlar) va har bir xodim uchun karta:
 * kim · "Vazifalar (N)" (3 tagacha ish) · "Profilni ko'rish" / "Vazifa berish". Telefonda karta ustunlari ustma-ust. */
export default function PeoplePage() {
  const boss = useMe().role === "boss";
  const { open } = useModal();
  const meta = useMeta();
  const [role, setRole] = useState(boss ? "" : "developer");
  const [onlyFree, setOnlyFree] = useState(false);
  const [q, setQ] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const search = useDebounced(q.trim().toLowerCase());
  const rangeError = Boolean(dueFrom && dueTo && dueTo < dueFrom);
  const hasRange = Boolean((dueFrom || dueTo) && !rangeError);
  const peopleQuery = usePagedList<Person>(["people", role, search, onlyFree, dueFrom, dueTo], "/people/", {
    role, q: search, free: onlyFree ? 1 : undefined,
    due_from: rangeError ? undefined : dueFrom, due_to: rangeError ? undefined : dueTo, paginated: 1,
  }, !rangeError);
  const rows = peopleQuery.data ?? [];
  const dirty = Boolean(q || dueFrom || dueTo || onlyFree || role !== (boss ? "" : "developer"));

  function clear() {
    setQ(""); setDueFrom(""); setDueTo(""); setOnlyFree(false); setRole(boss ? "" : "developer");
  }

  function identity(p: Person) {
    const free = p.role === "developer" && !p.is_on_business_trip && p.active_tasks === 0;
    return <div className="people-card-who">
      <button type="button" className="person-identity" title={T.people.profileOpen} onClick={() => open({ person: p.id })}>
        <Avatar user={p} size="lg" /><span className="stack-sm"><strong>{p.full_name}</strong><span className="muted">{p.department_name || p.specialty || p.role_label}</span></span>
      </button>
      {(p.is_on_business_trip || free || p.overdue_tasks > 0) && <div className="person-nums">
        {p.is_on_business_trip && <Badge tone="warning">{T.people.onBusinessTrip}</Badge>}
        {free && <Badge tone="success">{T.dashboard.free}</Badge>}
        {p.overdue_tasks > 0 && <Badge tone="danger">{T.people.overdueN(p.overdue_tasks)}</Badge>}
      </div>}
      {!!p.responsible_projects?.length && <p className="person-responsibilities-line small muted" title={T.people.responsible.line(p.responsible_projects)}>{T.people.responsible.line(p.responsible_projects)}</p>}
    </div>;
  }
  function actions(p: Person) {
    return <div className="people-card-actions">
      <Button icon={<User size={18} />} onClick={() => open({ person: p.id })}>{T.people.profileOpen}</Button>
      {p.role === "developer" && <Button variant="primary" icon={<Plus size={18} />} disabled={p.is_on_business_trip} title={p.is_on_business_trip ? T.people.tripBlocked : undefined} onClick={() => open({ new: "task", assignee: p.id })}>{T.people.giveTask}</Button>}
    </div>;
  }

  return <div className="people-page">
    <h2 className="people-title">{T.nav.people}</h2>
    <div className="card card-pad people-toolbar">
      <div className="people-filters">
        <label className="people-search people-filter-search">
          <Search size={20} className="muted" aria-hidden="true" />
          <input type="search" aria-label={T.filters.search} placeholder={T.people.searchPh} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="people-filter-range">
          <div className={`input people-range ${rangeError ? "invalid" : ""}`} role="group" aria-label={T.people.dueRange} title={T.people.dueRange}>
            <CalendarDays size={20} className="muted" aria-hidden="true" />
            <input type="date" aria-label={T.filters.dateFrom} value={dueFrom} max={dueTo || undefined} onChange={(e) => setDueFrom(e.target.value)} />
            <span className="muted" aria-hidden="true">—</span>
            <input type="date" aria-label={T.filters.dateTo} value={dueTo} min={dueFrom || undefined} aria-invalid={rangeError} onChange={(e) => setDueTo(e.target.value)} />
          </div>
          {rangeError && <span className="field-error" role="alert">{T.people.rangeError}</span>}
        </div>
        {boss && <select className="select people-filter-role" aria-label={T.people.role} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">{T.people.allRoles}</option>
          {meta.roles.filter((r) => r.value !== "boss").map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>}
      </div>
      <div className="people-toolbar-foot">
        <label className="check"><input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} />{T.people.onlyFree}</label>
        {peopleQuery.data && <p className="small muted people-found" role="status">
          {T.people.found(peopleQuery.pagination?.count ?? 0)}{hasRange && ` · ${T.people.rangeHint}`}
        </p>}
        {dirty && <Button size="sm" variant="ghost" icon={<X size={16} />} className="people-filter-clear" onClick={clear}>{T.filters.clear}</Button>}
      </div>
    </div>
    {peopleQuery.error && <ErrorBox error={peopleQuery.error} onRetry={() => peopleQuery.refetch()} />}
    {peopleQuery.isLoading && <div className="card"><SkeletonRows rows={6} /></div>}
    {peopleQuery.data && !rows.length && <div className="card"><Empty icon={<Users />} title={T.people.empty} hint={hasRange ? T.people.emptyRangeHint : T.people.emptyHint} /></div>}
    {rows.length > 0 && <div className="people-list">
      {rows.map((p) => <article key={p.id} className="card people-card" aria-label={p.full_name}>
        {identity(p)}
        <div className="people-card-work"><PersonWork person={p} /></div>
        {actions(p)}
      </article>)}
    </div>}
    <Pagination data={peopleQuery.pagination} page={peopleQuery.page} onPageChange={peopleQuery.onPageChange} />
  </div>;
}
