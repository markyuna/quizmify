"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Trophy } from "lucide-react";

import { useWebGLSupport, usePrefersReducedMotion } from "@/lib/webgl";
import type { TrophyReason } from "@/app/api/quiz/submit/route";

const Trophy3DScene = dynamic(() => import("./Trophy3DScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-full bg-amber-200/30" />,
});

type Trophy3DProps = {
  reason: TrophyReason;
  streakCount?: number | null;
  size?: number;
};

export default function Trophy3D({ reason, streakCount, size = 220 }: Trophy3DProps) {
  const webglOk = useWebGLSupport();
  const reducedMotion = usePrefersReducedMotion();

  const dimension = { width: size, height: size };

  if (webglOk === false) {
    return (
      <div style={dimension} className="mx-auto flex items-center justify-center">
        <Trophy className="h-20 w-20 text-amber-400" />
      </div>
    );
  }

  return (
    <div style={dimension} className="mx-auto">
      {webglOk !== null && (
        <Trophy3DScene reason={reason} streakCount={streakCount} reducedMotion={reducedMotion} />
      )}
    </div>
  );
}
