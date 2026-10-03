"use client";

import * as React from "react";
import { useSession } from "next-auth/react";

import { PRESENCE_HEARTBEAT_INTERVAL_MS } from "@/lib/presence";

/**
 * Writes User.lastSeenAt via a periodic heartbeat so friends can see
 * "online" / "last seen" presence (src/lib/presence.ts). Same mount pattern
 * as IdleTimeoutProvider: lives in the root layout, renders nothing, is a
 * total no-op while logged out.
 *
 * Deliberately separate from IdleTimeoutProvider/useIdleTimeout -- that
 * hook's useSession().update() calls only ever touch the JWT's
 * lastActivity claim (idle-timeout bookkeeping) and never reach the DB.
 * This provider is the only thing that writes lastSeenAt, via its own
 * POST /api/presence, and never calls useSession().update() itself.
 *
 * Heartbeats only fire while the tab is visible (document.visibilityState):
 * hidden tabs clear the interval entirely rather than continuing to ping in
 * the background, and becoming visible again fires one immediate heartbeat
 * before restarting the interval. If mounted while already hidden (e.g. a
 * background tab), it waits for the first visibilitychange instead of
 * firing blind -- "only while visible" is the invariant, including the
 * very first beat.
 */
export default function PresenceProvider() {
  const { status } = useSession();
  const authenticated = status === "authenticated";

  React.useEffect(() => {
    if (!authenticated) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    const stopInterval = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const sendHeartbeat = () => {
      fetch("/api/presence", { method: "POST" })
        .then((res) => {
          // Session expired server-side -- stop pinging until a future
          // mount (fresh login) re-arms this effect via `authenticated`.
          if (res.status === 401 && !stopped) {
            stopped = true;
            stopInterval();
          }
        })
        .catch(() => {
          // Best-effort -- a network hiccup just skips this beat.
        });
    };

    const startInterval = () => {
      stopInterval();
      intervalId = setInterval(sendHeartbeat, PRESENCE_HEARTBEAT_INTERVAL_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!stopped) sendHeartbeat();
        if (!stopped) startInterval();
      } else {
        stopInterval();
      }
    };

    if (document.visibilityState === "visible") {
      sendHeartbeat();
      startInterval();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      stopInterval();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [authenticated]);

  return null;
}
