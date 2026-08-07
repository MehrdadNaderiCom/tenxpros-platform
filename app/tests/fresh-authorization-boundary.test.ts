import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let currentPathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

import {
  FreshAuthorizationBoundary,
  hasFreshAuthorization,
} from "../src/components/auth/fresh-authorization-boundary";

describe("FreshAuthorizationBoundary", () => {
  beforeEach(() => {
    currentPathname = "/admin";
  });

  it("hides protected children on the initial mount until authorization succeeds", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        FreshAuthorizationBoundary,
        {
          surface: "admin",
          children: React.createElement("div", null, "sensitive admin content"),
        },
      ),
    );

    expect(html).toContain('aria-label="Checking account access"');
    expect(html).not.toContain("sensitive admin content");
  });

  it("starts closed again when the boundary remounts at the same protected path", () => {
    const firstMount = renderToStaticMarkup(
      React.createElement(
        FreshAuthorizationBoundary,
        {
          surface: "admin",
          children: React.createElement("div", null, "first protected content"),
        },
      ),
    );

    const remount = renderToStaticMarkup(
      React.createElement(
        FreshAuthorizationBoundary,
        {
          surface: "admin",
          children: React.createElement("div", null, "remounted protected content"),
        },
      ),
    );

    expect(firstMount).not.toContain("first protected content");
    expect(remount).toContain('aria-label="Checking account access"');
    expect(remount).not.toContain("remounted protected content");
  });

  it("accepts only a grant for the exact current path and authorization surface", () => {
    const grant = { pathname: "/admin", surface: "admin" as const };

    expect(hasFreshAuthorization(grant, "/admin", "admin")).toBe(true);
    expect(hasFreshAuthorization(grant, "/admin/users", "admin")).toBe(false);
    expect(hasFreshAuthorization(grant, "/admin", "partner")).toBe(false);
    expect(hasFreshAuthorization(null, "/admin", "admin")).toBe(false);
  });
});
