"use client";

import { createElement, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type AuthorizationSurface = "admin" | "partner" | "portal";

type FreshAuthorization = {
  pathname: string;
  surface: AuthorizationSurface;
};

export function hasFreshAuthorization(
  authorization: FreshAuthorization | null,
  pathname: string,
  surface: AuthorizationSurface,
) {
  return authorization?.pathname === pathname && authorization.surface === surface;
}

/**
 * App Router can prefetch a protected React Server Component while a session is
 * still valid and reuse it after an account change. Server templates and actions
 * remain authoritative; this boundary additionally hides every client-nav result
 * until a no-store, DB-backed authorization check succeeds for the new path.
 */
export function FreshAuthorizationBoundary({
  surface,
  children,
}: {
  surface: AuthorizationSurface;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Never trust the path merely because this client boundary mounted there.
  // In particular, a newly mounted boundary may contain prefetched RSC output
  // from a session that has since been revoked.
  const [authorization, setAuthorization] = useState<FreshAuthorization | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void fetch(`/api/auth/fresh?surface=${surface}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { "x-tenxpros-auth-boundary": pathname },
      signal: controller.signal,
    })
      .then((response) => {
        if (cancelled) return;
        if (!response.ok) {
          const callbackUrl = encodeURIComponent(pathname);
          window.location.replace(`/login?callbackUrl=${callbackUrl}`);
          return;
        }
        setAuthorization({ pathname, surface });
      })
      .catch(() => {
        if (!cancelled) window.location.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, surface]);

  if (!hasFreshAuthorization(authorization, pathname, surface)) {
    return createElement("div", {
      className: "min-h-screen bg-neutral-50",
      "aria-label": "Checking account access",
    });
  }
  return children;
}
