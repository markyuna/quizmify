"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { isQuizMarkedFinished } from "@/lib/finishedQuizMarker";

type FinishedQuizGuardProps = {
  gameId: string;
  children: React.ReactNode;
};

/**
 * Sends a browser back/forward onto an already-submitted game to its
 * statistics page instead of restarting it (see finishedQuizMarker for why
 * the server-side redirect alone can't catch that case).
 *
 * Checked once on mount only: the marker gets set while the result screen
 * is showing, and that screen must stay put rather than redirect away.
 * useLayoutEffect so the swap to the loader happens before first paint.
 */
export default function FinishedQuizGuard({ gameId, children }: FinishedQuizGuardProps) {
  const router = useRouter();
  const [redirecting, setRedirecting] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!isQuizMarkedFinished(gameId)) return;
    setRedirecting(true);
    router.replace(`/statistics/${gameId}`);
  }, [gameId, router]);

  if (redirecting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
      </div>
    );
  }

  return <>{children}</>;
}
