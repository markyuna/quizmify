"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGuestId } from "@/hooks/useGuestRound";
import { useSubmitPersonalityTest } from "@/hooks/usePersonalityTest";
import { QUESTIONS, QUEL_ANIMAL_ES_TU_IMAGES, type AnimalKey } from "@/lib/personalityTests/quelAnimalEsTu.config";
import ConversionModal from "./ConversionModal";

type PersonalityTestAnswer = { questionId: string; optionId: string };

type RevealedResult = {
  resultKey: AnimalKey;
  scores: Record<string, number>;
};

type PersonalityTestCardProps = {
  isAuthenticated: boolean;
};

// isAuthenticated is accepted for parity with the other GameRenderer cards
// but unused here -- an evergreen personality test has no "already played
// today" gate to special-case for signed-in users.
export default function PersonalityTestCard({}: PersonalityTestCardProps) {
  const t = useTranslations("PersonalityTests.quelAnimalEsTu");
  const guestId = useGuestId();
  const submitTest = useSubmitPersonalityTest();

  const [answers, setAnswers] = React.useState<PersonalityTestAnswer[]>([]);
  const [showModal, setShowModal] = React.useState(false);
  const [revealedResult, setRevealedResult] = React.useState<RevealedResult | null>(null);

  const currentQuestion = QUESTIONS[answers.length];

  async function handleSelect(optionId: string) {
    if (!guestId || submitTest.isPending) return;

    const nextAnswers = [...answers, { questionId: currentQuestion.id, optionId }];
    setAnswers(nextAnswers);

    if (nextAnswers.length < QUESTIONS.length) return;

    const result = await submitTest.mutateAsync({
      testKey: "quel_animal_es_tu",
      guestId,
      answers: nextAnswers,
    });

    if (result.claimed && result.resultKey && result.scores) {
      setRevealedResult({ resultKey: result.resultKey as AnimalKey, scores: result.scores });
    } else {
      setShowModal(true);
    }
  }

  function handleRetake() {
    setAnswers([]);
    setRevealedResult(null);
    setShowModal(false);
  }

  // The ConversionModal must stay mounted across every branch below -- it's
  // how a guest's result is revealed post-registration, so hiding it behind
  // an early return (e.g. while showModal is true but we're also mid-render
  // of the "calculating" state) would strand them on a spinner forever.
  let body: React.ReactNode;

  if (!guestId) {
    body = (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  } else if (revealedResult) {
    const animalImage = QUEL_ANIMAL_ES_TU_IMAGES[revealedResult.resultKey];
    body = (
      <div className="rounded-2xl bg-slate-100 px-4 py-6 text-center dark:bg-white/10">
        <div className="relative mx-auto mb-4 h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-lg dark:border-white/20">
          <Image src={animalImage} alt={t(`animals.${revealedResult.resultKey}.name`)} fill className="object-cover" sizes="128px" />
        </div>
        <p className="text-lg font-black text-slate-900 dark:text-white">
          {t("yourResult", { animal: t(`animals.${revealedResult.resultKey}.name`) })}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
          {t(`animals.${revealedResult.resultKey}.description`)}
        </p>
        <Button className="mt-4" size="sm" variant="outline" onClick={handleRetake}>
          {t("retakeCta")}
        </Button>
      </div>
    );
  } else if (submitTest.isPending || !currentQuestion) {
    // The !currentQuestion case also covers the render right after the 8th
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
      <ConversionModal open={showModal} onOpenChange={setShowModal} namespace="PersonalityTests.quelAnimalEsTu.conversionModal" />
    </div>
  );
}
