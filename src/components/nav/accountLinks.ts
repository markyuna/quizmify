import { Flame, History, LayoutDashboard, Settings, Sparkles, Trophy } from "lucide-react";
import type { ComponentType } from "react";

export type AccountLink = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  // Key into the UserMenu i18n namespace.
  labelKey: "dashboard" | "quiz" | "games" | "history" | "leaderboard" | "myAccount";
};

/**
 * Shared between UserAccountNav.tsx (desktop account dropdown) and
 * nav/MobileMenu.tsx (mobile's folded-in account section) so the two lists
 * can't drift apart -- add a link here once and both surfaces get it.
 */
export const ACCOUNT_LINKS: AccountLink[] = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { href: "/quiz", icon: Sparkles, labelKey: "quiz" },
  { href: "/games", icon: Flame, labelKey: "games" },
  { href: "/history", icon: History, labelKey: "history" },
  { href: "/leaderboard", icon: Trophy, labelKey: "leaderboard" },
  { href: "/account", icon: Settings, labelKey: "myAccount" },
];
