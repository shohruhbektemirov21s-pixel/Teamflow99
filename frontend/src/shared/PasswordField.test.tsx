import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { T } from "./text";
import { PasswordField } from "./PasswordField";

describe("PasswordField", () => {
  it("toggles password visibility without submitting the form", () => {
    render(<form><PasswordField label={T.auth.password} value="secret" onChange={() => {}} autoComplete="current-password" /></form>);
    const input = screen.getByLabelText(T.auth.password);
    const toggle = screen.getByRole("button", { name: T.auth.showPassword });

    expect(input.getAttribute("type")).toBe("password");
    fireEvent.click(toggle);
    expect(input.getAttribute("type")).toBe("text");
    expect(screen.getByRole("button", { name: T.auth.hidePassword }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: T.auth.hidePassword }));
    expect(input.getAttribute("type")).toBe("password");
  });
});
