import * as React from "react";

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

/** null while still checking on mount, then the actual support state. */
export function useWebGLSupport(): boolean | null {
  const [supported, setSupported] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setSupported(supportsWebGL());
  }, []);

  return supported;
}

export function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return reducedMotion;
}
