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

afterEach(() => {
  testUser.current = PM;
  localStorage.clear();
});

describe("UserDashboard", () => {
  it("dasturchilarni karta qilib ko'rsatadi va 'Kuzatayotganlarim' filtri faqat kuzatilganlarni so'raydi", async () => {
    testUser.current = { ...PM, id: 20, role: "user", role_label: "Oddiy foydalanuvchi" };
    mockGet({
      "/portfolio/": { count: 1, next: null, previous: null, results: [dev(1, "Jasur Alimov", false)] },
      "/portfolio/?following=1": { count: 1, next: null, previous: null, results: [dev(2, "Malika Karimova", true)] },
    });
    renderApp(<UserDashboard />);

    expect(await screen.findByText("Jasur Alimov")).toBeTruthy();
    expect(screen.getByRole("button", { name: new RegExp(T.user.view) })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: T.user.filterFollowing }));
    expect(await screen.findByText("Malika Karimova")).toBeTruthy();
  });

  it("'Qanday ishlaydi?' izohi bir marta yopiladi", async () => {
    mockGet({ "/portfolio/": { count: 0, next: null, previous: null, results: [] } });
    renderApp(<UserDashboard />);

    fireEvent.click(await screen.findByRole("button", { name: T.user.howClose }));
    expect(screen.queryByText(T.user.howTitle)).toBeNull();
    expect(localStorage.getItem("user-how-seen")).toBe("1");
  });
});
