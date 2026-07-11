"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Globe } from "lucide-react";

import { useWebGLSupport, usePrefersReducedMotion } from "@/lib/webgl";

const Globe3DScene = dynamic(() => import("./Globe3DScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-blue-950/10 dark:bg-blue-500/10" />,
});

type Globe3DProps = {
  litCountries: string[];
  size?: number;
};

export default function Globe3D({ litCountries, size = 240 }: Globe3DProps) {
  const webglOk = useWebGLSupport();
  const reducedMotion = usePrefersReducedMotion();

  const dimension = { width: size, height: size };

  if (webglOk === false) {
    return (
      <div
        style={dimension}
        className="mx-auto flex flex-col items-center justify-center gap-2 rounded-full bg-blue-950/5 dark:bg-blue-500/5"
      >
        <Globe className="h-12 w-12 text-blue-500" />
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
          {litCountries.length}
        </span>
      </div>
    );
  }

  return (
    <div style={dimension} className="mx-auto overflow-hidden rounded-full">
      {webglOk !== null && (
        <Globe3DScene litCountries={litCountries} reducedMotion={reducedMotion} />
      )}
    </div>
  );
}
