"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

type TabItem = {
  key: string;
  label: string;
  // A tab is either a navigation link (href) or an in-place toggle
  // (onClick). Exactly one is expected per item.
  href?: string;
  onClick?: () => void;
};

type TabBarProps = {
  items: TabItem[];
  activeKey: string;
  size?: "sm" | "md";
  ariaLabel?: string;
};

/**
 * Shared pill-style tab bar. Used both as query-param navigation (the
 * /history page passes `href` items) and as an in-place toggle (the
 * dashboard history card passes `onClick` items) so the two read the
 * same visually.
 */
export default function TabBar({ items, activeKey, size = "md", ariaLabel }: TabBarProps) {
  const itemClass = (active: boolean) =>
    cn(
      "rounded-xl font-semibold transition",
      size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
      active
        ? "bg-violet-600 text-white shadow-sm"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    );

  return (
    <div
      aria-label={ariaLabel}
      className="flex w-fit gap-1 rounded-2xl border border-border/50 bg-muted/30 p-1"
    >
      {items.map((item) => {
        const active = item.key === activeKey;

        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={itemClass(active)}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            aria-pressed={active}
            className={itemClass(active)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
