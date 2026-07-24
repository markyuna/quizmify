"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

import type { OptionTheme } from "@/lib/kahootConfig";
import { cn } from "@/lib/utils";

type OptionButtonProps = {
  label: string;
  theme: OptionTheme;
  disabled: boolean;
  hasAnswered: boolean;
  isSelected: boolean;
  isCorrect: boolean;
  onClick: () => void;
};

export default function OptionButton({
  label,
  theme,
  disabled,
  hasAnswered,
  isSelected,
  isCorrect,
  onClick,
}: OptionButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const Icon = theme.icon;

  const revealState = !hasAnswered ? "idle" : isCorrect ? "correct" : isSelected ? "wrong" : "faded";

  const feedbackAnimation = shouldReduceMotion
    ? undefined
    : revealState === "correct"
      ? { scale: [1, 1.08, 0.98, 1.03, 1] }
      : revealState === "wrong"
        ? { x: [0, -8, 8, -6, 6, 0] }
        : undefined;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled && !shouldReduceMotion ? { scale: 1.03 } : undefined}
      whileTap={!disabled && !shouldReduceMotion ? { scale: 0.97 } : undefined}
      animate={feedbackAnimation}
      transition={feedbackAnimation ? { duration: 0.45, ease: "easeInOut" } : undefined}
      className={cn(
        "relative flex min-h-[96px] w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-base font-bold text-white shadow-lg transition-opacity duration-200 sm:min-h-[120px] sm:text-lg",
        "disabled:cursor-not-allowed",
        theme.className,
        revealState === "faded" && "opacity-30",
        revealState === "correct" && "ring-4 ring-white/80",
        revealState === "wrong" && "ring-4 ring-white/40"
      )}
    >
      <Icon className="h-6 w-6 shrink-0 fill-current sm:h-7 sm:w-7" strokeWidth={2.5} />
      <span className="min-w-0 break-words">{label}</span>

      {hasAnswered && isCorrect && (
        <CheckCircle2 className="ml-auto h-6 w-6 shrink-0 text-white" />
      )}
      {hasAnswered && isSelected && !isCorrect && (
        <XCircle className="ml-auto h-6 w-6 shrink-0 text-white" />
      )}
    </motion.button>
  );
}
