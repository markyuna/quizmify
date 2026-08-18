"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGuestId } from "@/hooks/useGuestRound";
import { useSubmitPersonalityTest, usePersonalityAnimalStatus } from "@/hooks/usePersonalityTest";
import { QUESTIONS, type AnimalKey, type CategorySlug } from "@/lib/personalityTests/quelAnimalEsTu.config";
import PersonalityResultModal from "./PersonalityResultModal";

type PersonalityTestAnswer = { questionId: string; optionId: string };

type SubmittedResult = {
  attemptId: string;
  resultKey: AnimalKey;
  claimed: boolean;
  recommendations: CategorySlug[];
};

type PersonalityTestCardProps = {
  isAuthenticated: boolean;
};

export default function PersonalityTestCard({ isAuthenticated }: PersonalityTestCardProps) {
  const t = useTranslations("PersonalityTests.quelAnimalEsTu");
  const guestId = useGuestId();
  const submitTest = useSubmitPersonalityTest();
  const animalStatus = usePersonalityAnimalStatus(isAuthenticated);

  const [answers, setAnswers] = React.useState<PersonalityTestAnswer[]>([]);
  const [result, setResult] = React.useState<SubmittedResult | null>(null);
  // True once the result modal was closed without a decision (X / click
  // outside) -- the attempt stays alive unconfirmed, this just hides the
  // modal and offers a way back into it instead of leaving a blank card.
  const [dismissed, setDismissed] = React.useState(false);

  const currentQuestion = QUESTIONS[answers.length];

  async function handleSelect(optionId: string) {
    if (!guestId || submitTest.isPending) return;

    const nextAnswers = [...answers, { questionId: currentQuestion.id, optionId }];
    setAnswers(nextAnswers);

    if (nextAnswers.length < QUESTIONS.length) return;

    const response = await submitTest.mutateAsync({
      testKey: "quel_animal_es_tu",
      guestId,
      answers: nextAnswers,
    });

    setResult({
      attemptId: response.attemptId,
      resultKey: response.resultKey as AnimalKey,
      claimed: response.claimed,
      recommendations: response.recommendations as CategorySlug[],
    });
    setDismissed(false);
  }

  function handleRetried() {
    setAnswers([]);
    setResult(null);
    setDismissed(false);
  }

  let body: React.ReactNode;

  if (isAuthenticated && animalStatus.data?.hasAnimal) {
    body = (
      <div className="rounded-2xl bg-slate-100 px-4 py-10 text-center dark:bg-white/10">
        <p className="text-base font-bold text-slate-900 dark:text-white">{t("alreadyAssigned.title")}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
          {t("alreadyAssigned.description")}
        </p>
      </div>
    );
  } else if (!guestId || (isAuthenticated && animalStatus.isPending)) {
    body = (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  } else if (result) {
    body = dismissed ? (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("resultModal.reopenPrompt")}</p>
        <Button size="sm" onClick={() => setDismissed(false)}>
          {t("resultModal.reopenCta")}
        </Button>
      </div>
    ) : null;
  } else if (submitTest.isPending || !currentQuestion) {
    // The !currentQuestion case also covers the render right after the 13th
    // answer: setAnswers(nextAnswers) and submitTest's isPending flag don't
    // land in the same React batch, so there's a tick where answers.length
    // === QUESTIONS.length but isPending is still false.
    body = (
      <div className="flex flex-col items-center justify-center gap-2 py-12">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <p className="text-xs text-slate-400">{t("submitting")}</p>
      </div>
    );
  } else {
    body = (
      <div>
        <p className="mb-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          {t("progress", { current: answers.length + 1, total: QUESTIONS.length })}
        </p>

        <p className="mb-4 text-center text-base font-semibold text-slate-900 dark:text-white">
          {t(`questions.${currentQuestion.id}.prompt`)}
        </p>

        <div className="flex flex-col gap-2">
          {currentQuestion.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                "border-slate-200 bg-white text-slate-900 hover:border-violet-400 hover:bg-violet-50",
                "dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-violet-500 dark:hover:bg-violet-500/10"
              )}
            >
              {t(`questions.${currentQuestion.id}.options.${option.id}`)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {body}
      {result && (
        <PersonalityResultModal
          open={!dismissed}
          onOpenChange={(open) => {
            if (!open) setDismissed(true);
          }}
          resultKey={result.resultKey}
          recommendations={result.recommendations}
          attemptId={result.attemptId}
          guestId={guestId}
          claimed={result.claimed}
          onRetried={handleRetried}
        />
      )}
    </div>
  );
}
