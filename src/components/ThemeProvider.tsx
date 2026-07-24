"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  /** Briefly disables CSS transitions while the class swaps, so colors
   * don't visibly animate across the whole page on a theme change. */
  disableTransitionOnChange?: boolean;
};

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export const DEFAULT_STORAGE_KEY = "theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

// Same technique next-themes uses: suppress transitions for one frame so
// the color swap is instant, not an animated crossfade across every element.
function withTransitionsDisabled(fn: () => void) {
  const style = document.createElement("style");
  style.textContent =
    "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  fn();
  // Force a style recalculation so the transition:none rule actually takes
  // effect before we remove it on the next tick.
  void window.getComputedStyle(style).transition;
  window.setTimeout(() => document.head.removeChild(style), 0);
}

export default function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = DEFAULT_STORAGE_KEY,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>("light");

  // Reconciles React state with whatever the blocking inline script in
  // <head> (see src/app/layout.tsx) already applied before hydration -- this
  // never causes a visible flash, it just brings state in sync post-mount.
  React.useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(storageKey);
    } catch {
      // localStorage can throw in private-browsing/quota-exceeded edge cases.
    }

    const initial: Theme = stored === "light" || stored === "dark" || stored === "system" ? stored : defaultTheme;
    setThemeState(initial);
    setResolvedTheme(resolve(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = getSystemTheme();
      setResolvedTheme(next);
      applyResolvedTheme(next);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      const next = event.newValue as Theme;
      const resolved = resolve(next);
      setThemeState(next);
      setResolvedTheme(resolved);
      applyResolvedTheme(resolved);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  const setTheme = React.useCallback(
    (next: Theme) => {
      const resolved = resolve(next);
      const apply = () => {
        setThemeState(next);
        setResolvedTheme(resolved);
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          // Best-effort persistence only.
        }
        applyResolvedTheme(resolved);
      };

      if (disableTransitionOnChange) withTransitionsDisabled(apply);
      else apply();
    },
    [storageKey, disableTransitionOnChange]
  );

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
