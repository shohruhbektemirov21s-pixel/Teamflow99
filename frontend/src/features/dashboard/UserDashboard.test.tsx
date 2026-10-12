import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { T } from "@/shared/text";
import type { PortfolioDeveloper } from "@/shared/types";
import { PM, testUser } from "@/test/fixtures";
import { mockGet, renderApp } from "@/test/render";

import UserDashboard from "./UserDashboard";

const dev = (id: number, name: string, following: boolean): PortfolioDeveloper => ({
  id, full_name: name, role: "developer", department_name: "", avatar: null, specialty: "Backend dasturchi",
  rating: 4.5, reviews_count: 2, followers_count: 3, projects_count: 1, tasks_done: 4, is_following: following, rank: id,
});
const page = (...rows: PortfolioDeveloper[]) => ({ count: rows.length, next: null, previous: null, results: rows });
const SUMMARY = { developers: 3, average_rating: 4.6, rated_projects: 7, specialties: [{ id: 5, name: "Backend dasturchi" }] };

afterEach(() => {
  testUser.current = PM;
  localStorage.clear();
});

describe("UserDashboard", () => {
  it("umumiy ko'rsatkichlar va dasturchi kartalarini ko'rsatadi", async () => {
    testUser.current = { ...PM, id: 20, role: "user", role_label: "Oddiy foydalanuvchi" };
    mockGet({ "/portfolio/summary/": SUMMARY, "/portfolio/": page(dev(1, "Jasur Alimov", false)) });
    renderApp(<UserDashboard />);

    expect(await screen.findByText("Jasur Alimov")).toBeTruthy();
    expect(await screen.findByText("4.6")).toBeTruthy();
    expect(screen.getByText(T.user.statRated)).toBeTruthy();
    expect(screen.getByRole("button", { name: T.user.viewProfile })).toBeTruthy();
  });

  it("'Kuzatayotganlarim' va mutaxassislik chiplari tegishli filtrni so'raydi", async () => {
    mockGet({
      "/portfolio/summary/": SUMMARY,
      "/portfolio/": page(dev(1, "Jasur Alimov", false)),
      "/portfolio/?following=1": page(dev(2, "Malika Karimova", true)),
      "/portfolio/?specialty=5": page(dev(3, "Bobur Rahimov", false)),
    });
    renderApp(<UserDashboard />);

    await screen.findByText("Jasur Alimov");
    fireEvent.click(screen.getByRole("button", { name: T.user.filterFollowing }));
    expect(await screen.findByText("Malika Karimova")).toBeTruthy();

    fireEvent.click(await screen.findByRole("button", { name: "Backend dasturchi" }));
    expect(await screen.findByText("Bobur Rahimov")).toBeTruthy();
  });

  it("saralash tanlansa so'rovga sort qo'shiladi", async () => {
    mockGet({
      "/portfolio/summary/": SUMMARY,
      "/portfolio/": page(dev(1, "Jasur Alimov", false)),
      "/portfolio/?sort=followers": page(dev(3, "Bobur Rahimov", false)),
    });
    renderApp(<UserDashboard />);

    await screen.findByText("Jasur Alimov");
    fireEvent.change(screen.getByLabelText(T.user.sortLabel), { target: { value: "followers" } });
    expect(await screen.findByText("Bobur Rahimov")).toBeTruthy();
  });

  it("'Qanday ishlaydi?' izohi bir marta yopiladi", async () => {
    mockGet({ "/portfolio/summary/": SUMMARY, "/portfolio/": page() });
    renderApp(<UserDashboard />);

    fireEvent.click(await screen.findByRole("button", { name: T.user.howClose }));
    expect(screen.queryByText(T.user.howTitle)).toBeNull();
    expect(localStorage.getItem("user-how-seen")).toBe("1");
  });
});
