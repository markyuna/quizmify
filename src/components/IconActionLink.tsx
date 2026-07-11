import Link from "next/link";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

type IconActionLinkProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  className?: string;
};

/**
 * Icon-only nav link for the quiz-results action row. The 44x44 touch
 * target (h-11 w-11) follows the standard mobile a11y minimum even though
 * the icon glyph itself is smaller; the tooltip covers desktop hover, and
 * `aria-label` carries the accessible name since there's no visible text.
 */
export default function IconActionLink({ href, label, icon, className }: IconActionLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-label={label}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-600 transition hover:border-slate-300 hover:bg-white active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10",
            className
          )}
        >
          {icon}
        </Link>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
