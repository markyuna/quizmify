"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

const SYNCED_FLAG = "quizmify:timezone-synced";

/**
 * Fire-and-forget: reports the browser's IANA timezone to the server once
 * per browser session (not on every page load) so notification cron jobs
 * can send reminders at a reasonable local hour instead of a single blind
 * UTC time. No client-side auth check -- the endpoint itself requires a
 * session and just 401s quietly if there isn't one (e.g. on /login).
 *
 * Lives in the root layout, which Next.js does NOT remount on client-side
 * navigation -- only on a full page load. If the first mount happens while
 * logged out (e.g. landing on /login), a plain `useEffect(fn, [])` would
 * never get another chance to sync after the user signs in via a
 * router.push. Depending on `pathname` re-runs the check on every route
 * change until it actually succeeds.
 *
 * Renders nothing.
 */
export default function TimezoneSync() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (sessionStorage.getItem(SYNCED_FLAG)) return;

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) return;

    fetch("/api/user/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
    })
      .then((res) => {
        if (res.ok) sessionStorage.setItem(SYNCED_FLAG, "1");
      })
      .catch(() => {
        /* best-effort -- next route change will retry */
      });
  }, [pathname]);

  return null;
}
