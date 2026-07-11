"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { getAvatarTierForLevel } from "@/lib/avatar";
import { useWebGLSupport, usePrefersReducedMotion } from "@/lib/webgl";
import { cn } from "@/lib/utils";

const Avatar3DScene = dynamic(() => import("./Avatar3DScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-full bg-slate-200/60 dark:bg-white/5" />,
});

type Avatar3DProps = {
  level: number;
  size?: number;
  className?: string;
};

export default function Avatar3D({ level, size = 160, className }: Avatar3DProps) {
  const tier = getAvatarTierForLevel(level);
  const webglOk = useWebGLSupport();
  const reducedMotion = usePrefersReducedMotion();

  const dimension = { width: size, height: size };

  // Still checking WebGL support, or it's unavailable: render a flat CSS
  // fallback so low-end/older devices never end up with a blank dashboard
  // slot.
  if (webglOk === false) {
    return (
      <div
        style={dimension}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full shadow-inner",
          className
        )}
      >
        <div
          className="flex h-full w-full items-center justify-center rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${tier.accentColor}, ${tier.primaryColor})`,
          }}
        >
          <span className="text-xs font-bold text-white/90">{tier.label}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={dimension} className={cn("shrink-0", className)}>
      {webglOk !== null && (
        <Avatar3DScene tier={tier} reducedMotion={reducedMotion} />
      )}
    </div>
  );
}
