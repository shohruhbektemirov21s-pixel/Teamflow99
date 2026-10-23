import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { mockGet, renderApp } from "@/test/render";

import Dashboard from "./Dashboard";

const DASHBOARD = {
  periods: [
    { key: "week", label: "Hafta boshidan", since: "2026-10-19", counts: { active: 3, overdue: 1, done: 2 } },
  ],
  totals: { active: 3, overdue: 1, done: 2, late: 0, review: 1 },
};

describe("Dashboard", () => {
  it("ochilganda shu hafta faol vazifalari tanlangan bo'ladi", async () => {
    mockGet({
      "/dashboard/": DASHBOARD,
      "/tasks/?bucket=active&period=week": { count: 0, next: null, previous: null, results: [] },
    });
    renderApp(<Dashboard />);

    const chip = await screen.findByRole("button", { name: /Faol\s*3/ });
    expect(chip.className).toContain("selected");
  });
});
