"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from "@/lib/idleTimeoutConfig";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
const BROADCAST_CHANNEL_NAME = "quizmify-idle-timeout";
const STORAGE_KEY = "quizmify-idle-last-activity";

// Local resets are cheap (just re-arm timers), but we don't want every
// mousemove hitting the NextAuth session endpoint -- only sync the
// server-side `lastActivity` claim at most this often.
const ACTIVITY_RESET_THROTTLE_MS = 1_000;
const SERVER_SYNC_THROTTLE_MS = 60_000;

type BroadcastMessage = { at: number };

export function useIdleTimeout() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.round(IDLE_WARNING_MS / 1000));

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastLocalResetRef = useRef(0);
  const lastServerSyncRef = useRef(0);
  const showWarningRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const authenticated = status === "authenticated";

  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const handleExpire = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    void signOut({ redirect: false }).then(() => {
      router.push("/login?reason=idle");
    });
  }, [clearTimers, router]);

  // Arms the warning + logout timers for a session with `remainingMs` left
  // before it should expire. Called both on a fresh reset (remainingMs ==
  // IDLE_TIMEOUT_MS) and on mount, when remainingMs may already be partially
  // elapsed (e.g. the tab was reopened after being idle for a while).
  const armTimers = useCallback(
    (remainingMs: number) => {
      clearTimers();

      const msUntilWarning = remainingMs - IDLE_WARNING_MS;

      const startCountdown = (fromMs: number) => {
        setShowWarning(true);
        setSecondsRemaining(Math.max(Math.round(fromMs / 1000), 0));
        countdownIntervalRef.current = setInterval(() => {
          setSecondsRemaining((s) => Math.max(s - 1, 0));
        }, 1000);
      };

      if (msUntilWarning <= 0) {
        const msUntilExpiry = Math.max(remainingMs, 0);
        startCountdown(msUntilExpiry);
        logoutTimerRef.current = setTimeout(handleExpire, msUntilExpiry);
        return;
      }

      setShowWarning(false);
      warningTimerRef.current = setTimeout(() => startCountdown(IDLE_WARNING_MS), msUntilWarning);
      logoutTimerRef.current = setTimeout(handleExpire, remainingMs);
    },
    [clearTimers, handleExpire]
  );

  const broadcastActivity = useCallback((at: number) => {
    channelRef.current?.postMessage({ at } satisfies BroadcastMessage);
    try {
      localStorage.setItem(STORAGE_KEY, String(at));
    } catch {
      // storage can throw in private-browsing/quota-exceeded edge cases --
      // cross-tab sync is a nice-to-have, not worth failing the reset over.
    }
  }, []);

  // Resets the idle timer from local activity. Ignored while the warning
  // modal is showing -- once the countdown starts, only the explicit
  // "extend session" action (or activity confirmed from another tab) should
  // stop it, not incidental background input.
  const onActivity = useCallback(() => {
    if (showWarningRef.current) return;

    const now = Date.now();
    if (now - lastLocalResetRef.current < ACTIVITY_RESET_THROTTLE_MS) return;
    lastLocalResetRef.current = now;

    armTimers(IDLE_TIMEOUT_MS);
    broadcastActivity(now);

    if (now - lastServerSyncRef.current > SERVER_SYNC_THROTTLE_MS) {
      lastServerSyncRef.current = now;
      void update();
    }
  }, [armTimers, broadcastActivity, update]);

  const extendSession = useCallback(() => {
    const now = Date.now();
    lastLocalResetRef.current = now;
    lastServerSyncRef.current = now;

    armTimers(IDLE_TIMEOUT_MS);
    setShowWarning(false);
    broadcastActivity(now);
    void update();
  }, [armTimers, broadcastActivity, update]);

  // Cross-tab sync: activity (or an explicit extend) in one tab resets the
  // timer -- and dismisses an already-showing warning -- in every other tab.
  useEffect(() => {
    if (!authenticated) return;

    const onRemoteActivity = (at: number) => {
      if (Number.isNaN(at)) return;
      lastLocalResetRef.current = at;
      armTimers(IDLE_TIMEOUT_MS);
      setShowWarning(false);
    };

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        onRemoteActivity(event.data?.at);
      };
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        onRemoteActivity(Number(event.newValue));
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      channel?.close();
      channelRef.current = null;
      window.removeEventListener("storage", onStorage);
    };
  }, [authenticated, armTimers]);

  // Wires up activity listeners and arms the initial timer from the
  // server-reported `lastActivity`, so a page refresh or a newly opened tab
  // resumes the existing countdown instead of granting a fresh 30 minutes.
  useEffect(() => {
    if (!authenticated) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    const serverLastActivity = session?.lastActivity ?? Date.now();
    const remaining = Math.max(IDLE_TIMEOUT_MS - (Date.now() - serverLastActivity), 0);
    armTimers(remaining);

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, session?.lastActivity]);

  return { authenticated, showWarning, secondsRemaining, extendSession };
}
