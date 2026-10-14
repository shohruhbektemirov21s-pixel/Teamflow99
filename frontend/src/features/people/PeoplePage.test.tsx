import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { T } from "@/shared/text";
import type { Person } from "@/shared/types";
import { JASUR, PM, testUser } from "@/test/fixtures";
import { mockGet, renderApp } from "@/test/render";

import PeoplePage from "./PeoplePage";

const person: Person = {
  ...JASUR, specialty: "Backend", role_label: "Dasturchi", active_tasks: 2,
  overdue_tasks: 1, review_tasks: 0, done_tasks: 0, doing: [],
  work: [
    { id: 12, title: "API tayyorlash", status: "in_progress", due_at: "2099-05-20T10:00:00Z", is_overdue: false, project: { id: 8, name: "Portal", code: "PRJ-8" } },
    { id: 13, title: "Admin panel", status: "in_progress", due_at: "2020-05-18T10:00:00Z", is_overdue: true, project: { id: 8, name: "Portal", code: "PRJ-8" } },
  ],
  projects: [{ id: 8, name: "Portal", code: "PRJ-8", stage: "started", end_date: "2099-01-01" }],
};

function LocationState() {
  const location = useLocation();
  return <output data-testid="modal-state">{JSON.stringify(location.state)}</output>;
}

afterEach(() => { testUser.current = PM; });

describe("PeoplePage", () => {
  it.each(["boss", "pm"] as const)("%s xodim kartasida vazifalarni ko'radi va profilni ochadi", async (role) => {
    testUser.current = { ...PM, role };
    mockGet({ [role === "boss" ? "/people/?paginated=1" : "/people/?role=developer&paginated=1"]: [person] });
    renderApp(<><PeoplePage /><LocationState /></>);
    const card = await screen.findByRole("article", { name: "Jasur Alimov" });
    expect(screen.getByRole("heading", { name: T.nav.people })).toBeTruthy();
    expect(within(card).getByRole("heading", { name: T.people.tasksN(2) })).toBeTruthy();
    const rows = within(card).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("API tayyorlash")).toBeTruthy();
    expect(within(rows[0]!).getByText("Portal")).toBeTruthy();
    expect(within(rows[0]!).getByText("20.05.2099")).toBeTruthy();
    expect(within(rows[1]!).getByText(T.people.late)).toBeTruthy();
    fireEvent.click(within(card).getByRole("button", { name: T.people.profileOpen }));
    await waitFor(() => expect(screen.getByTestId("modal-state").textContent).toContain('"person":3'));
  });

  it("vazifa, loyiha va 'Barchasini ko'rish' tegishli oynani ochadi", async () => {
    // Vazifasi yo'q xodimda — faol loyihalari ko'rinadi
    const projectOnly = { ...person, id: 5, full_name: "Loyihali xodim", active_tasks: 0, overdue_tasks: 0, work: [] };
    mockGet({ "/people/?role=developer&paginated=1": [person, projectOnly] });
    renderApp(<><PeoplePage /><LocationState /></>);
    const card = await screen.findByRole("article", { name: "Jasur Alimov" });
    fireEvent.click(within(card).getByRole("button", { name: /API tayyorlash/ }));
    await waitFor(() => expect(screen.getByTestId("modal-state").textContent).toContain('"task":12'));
    fireEvent.click(within(card).getByRole("button", { name: new RegExp(T.people.seeAll) }));
    await waitFor(() => expect(screen.getByTestId("modal-state").textContent).toContain('"person":3'));
    const other = screen.getByRole("article", { name: "Loyihali xodim" });
    expect(within(other).getByRole("heading", { name: T.people.projectsN(1) })).toBeTruthy();
    fireEvent.click(within(other).getByRole("button", { name: /Portal/ }));
    await waitFor(() => expect(screen.getByTestId("modal-state").textContent).toContain('"project":8'));
  });

  it("karta ichida tugmalar bir-biriga joylanmaydi va safarda vazifa berilmaydi", async () => {
    mockGet({ "/people/?role=developer&paginated=1": [{ ...person, is_on_business_trip: true }] });
    renderApp(<PeoplePage />);
    const card = await screen.findByRole("article");
    expect((within(card).getByRole("button", { name: T.people.giveTask }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(card).getByText(T.people.onBusinessTrip)).toBeTruthy();
    expect(card.querySelector("button button")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("loyiha nomi bilan xodim topiladi va bo'shlar filtri ishlaydi", async () => {
    const free = { ...person, id: 4, full_name: "Bo'sh xodim", active_tasks: 0, overdue_tasks: 0, work: [], projects: [] };
    mockGet({
      "/people/?role=developer&paginated=1": [person, free],
      "/people/?role=developer&q=portal&paginated=1": [person],
      "/people/?role=developer&free=1&paginated=1": [free],
      "/people/?role=developer&q=portal&free=1&paginated=1": [],
    });
    renderApp(<PeoplePage />);
    const freeCard = await screen.findByRole("article", { name: "Bo'sh xodim" });
    expect(within(freeCard).getByText(T.dashboard.free)).toBeTruthy();
    expect(within(freeCard).getByText(T.people.noWork)).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Portal" } });
    await waitFor(() => expect(screen.queryByText("Bo'sh xodim")).toBeNull());
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("checkbox", { name: T.people.onlyFree }));
    await waitFor(() => expect(screen.queryByText("Jasur Alimov")).toBeNull());
    expect((screen.getByRole("checkbox", { name: T.people.onlyFree }) as HTMLInputElement).checked).toBe(true);
  });

  it("vazifa muddati oralig'i bo'yicha filtrlaydi, teskari oraliqda so'rov yubormaydi va tozalanadi", async () => {
    const inRange: Person = { ...person, range_tasks: 3, work: [{ ...person.work![0]!, status: "done" }] };
    mockGet({
      "/people/?role=developer&paginated=1": [person],
      "/people/?role=developer&due_from=2026-10-01&paginated=1": [inRange],
      "/people/?role=developer&due_from=2026-10-01&due_to=2026-10-07&paginated=1": [inRange],
    });
    renderApp(<PeoplePage />);
    expect(await screen.findByRole("heading", { name: T.people.tasksN(2) })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(T.filters.dateFrom), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText(T.filters.dateTo), { target: { value: "2026-10-07" } });
    expect(await screen.findByRole("heading", { name: T.people.tasksN(3) })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(T.people.rangeHint);

    fireEvent.change(screen.getByLabelText(T.filters.dateTo), { target: { value: "2026-09-01" } });
    expect(await screen.findByText(T.people.rangeError)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: T.filters.clear }));
    await waitFor(() => expect(screen.queryByText(T.people.rangeError)).toBeNull());
    expect((screen.getByLabelText(T.filters.dateFrom) as HTMLInputElement).value).toBe("");
    expect(await screen.findByRole("heading", { name: T.people.tasksN(2) })).toBeTruthy();
  });
});
