"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import OptionButton from "./OptionButton";
import { KAHOOT_OPTION_THEMES } from "@/lib/kahootConfig";
import type { QuizGameQuestion } from "@/hooks/useQuizGame";

type QuestionCardProps = {
  question: QuizGameQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedOption: string | null;
  hasAnswered: boolean;
  disabled: boolean;
  onSelect: (option: string) => void;
};

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  hasAnswered,
  disabled,
  onSelect,
}: QuestionCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full"
    >
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-500 dark:text-violet-300">
          {questionNumber} / {totalQuestions}
        </p>

        {question.imageUrl && (
          <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/5">
            <Image
              src={question.imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 640px"
            />
          </div>
        )}

        <h2 className="text-center text-lg font-bold leading-snug text-slate-900 dark:text-white sm:text-xl">
          {question.question}
        </h2>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <OptionButton
            key={`${question.id}-${option}`}
            label={option}
            theme={KAHOOT_OPTION_THEMES[index % KAHOOT_OPTION_THEMES.length]}
            disabled={disabled}
            hasAnswered={hasAnswered}
            isSelected={option === selectedOption}
            isCorrect={option === question.answer}
            onClick={() => onSelect(option)}
          />
        ))}
      </div>
    </motion.div>
  );
}
