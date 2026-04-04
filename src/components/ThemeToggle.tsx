"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => mounted && setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-2xl",
        "border border-white/40 bg-white/70 backdrop-blur-md shadow-sm",
        "transition-all duration-300 hover:scale-105 hover:shadow-md",
        "dark:border-white/10 dark:bg-white/10",
        !mounted && "opacity-90"
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )
      ) : (
        <div className="h-5 w-5" />
      )}
    </button>
  );
}