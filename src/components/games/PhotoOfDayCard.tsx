"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getAllCountryNames } from "@/lib/geo-countries";
import { useGuestId, useGuestChallenge, useSubmitGuestAnswer } from "@/hooks/useGuestRound";
import { usePersonalityAnimalStatus } from "@/hooks/usePersonalityTest";
import ConversionModal from "./ConversionModal";
import MascotDiscoveryNudge from "./MascotDiscoveryNudge";

const ALL_COUNTRIES = getAllCountryNames();
const MAX_SUGGESTIONS = 6;

type RevealedResult = {
  isCorrect: boolean;
  country: string;
  place: string;
  xpAwarded: number;
};

type PhotoOfDayCardProps = {
  isAuthenticated: boolean;
};

export default function PhotoOfDayCard({ isAuthenticated }: PhotoOfDayCardProps) {
  const t = useTranslations("GuestGames.photoOfDay");
  const guestId = useGuestId();
  const { data: challengeData, isLoading: isChallengeLoading } = useGuestChallenge("photo_of_day", guestId);

  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [revealedResult, setRevealedResult] = React.useState<RevealedResult | null>(null);
  // Set when a submit comes back alreadyPlayedByUser -- this account
  // already completed today's round under a different guestId/session,
  // discovered only at submit time (challengeData.attempted was stale).
  // Forces the same already-played state challengeData.attempted drives.
  const [forcedAlreadyPlayed, setForcedAlreadyPlayed] = React.useState(false);

  const submitAnswer = useSubmitGuestAnswer();
  const animalStatus = usePersonalityAnimalStatus(isAuthenticated);

  const image = challengeData?.challenge.image as string | undefined;
  const credit = challengeData?.challenge.credit as { author: string; license: string; licenseUrl: string } | undefined;
  const alreadyPlayed = (challengeData?.attempted ?? false) || forcedAlreadyPlayed;

  const suggestions = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return ALL_COUNTRIES.filter((name) => name.toLowerCase().includes(normalized)).slice(0, MAX_SUGGESTIONS);
  }, [query]);

  async function handleSubmit() {
    if (!guestId || !challengeData || !selected) return;

    const result = await submitAnswer.mutateAsync({
      gameKey: "photo_of_day",
      guestId,
      challengeId: challengeData.challengeId,
      answer: { guess: selected },
    });

    if (result.alreadyPlayedByUser) {
      setForcedAlreadyPlayed(true);
    } else if (result.claimed) {
      const payload = result.resultPayload as { country?: string; place?: string } | undefined;
      setRevealedResult({
        isCorrect: result.isCorrect ?? false,
        country: payload?.country ?? "",
        place: payload?.place ?? "",
        xpAwarded: result.xpAwarded ?? 0,
      });
    } else {
      setShowModal(true);
    }
  }

  if (isChallengeLoading || !challengeData) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (alreadyPlayed && !revealedResult) {
    return (
      <div className="rounded-2xl bg-slate-100 px-3 py-4 text-center text-sm text-slate-500 dark:bg-white/10 dark:text-slate-400">
        {isAuthenticated ? t("comeBackTomorrow") : t("alreadyPlayedGuest")}
        {!isAuthenticated && (
          <Button className="mt-3 w-full" size="sm" onClick={() => setShowModal(true)}>
            {t("seeResultCta")}
          </Button>
        )}
        <ConversionModal open={showModal} onOpenChange={setShowModal} />
      </div>
    );
  }

  if (revealedResult) {
    return (
      <div className="rounded-2xl bg-slate-100 px-3 py-4 text-center dark:bg-white/10">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {revealedResult.isCorrect
            ? t("youWon", { place: revealedResult.place, country: revealedResult.country })
            : t("youLost", { place: revealedResult.place, country: revealedResult.country })}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("xpAwarded", { xp: revealedResult.xpAwarded })}
        </p>
        <MascotDiscoveryNudge
          isAuthenticated={isAuthenticated}
          hasMascot={!!animalStatus.data?.hasAnimal}
          lastDismissedAt={animalStatus.data?.lastMascotNudgeDismissedAt ?? null}
        />
      </div>
    );
  }

  return (
    <div>
      {image && (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
          <Image src={image} alt={t("photoAlt")} fill className="object-cover" sizes="(max-width: 640px) 100vw, 320px" />
        </div>
      )}
      {credit && (
        <p className="mt-1 text-right text-[10px] text-slate-400">
          {t("photoCredit", { author: credit.author })}{" "}
          <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {credit.license}
          </a>
        </p>
      )}

      <div className="relative mt-3">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={t("inputPlaceholder")}
          disabled={submitAnswer.isPending}
        />

        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelected(name);
                    setQuery(name);
                    setShowSuggestions(false);
                  }}
                >
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        className={cn("mt-2 w-full")}
        onClick={handleSubmit}
        disabled={!selected || submitAnswer.isPending}
      >
        {submitAnswer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submitGuess")}
      </Button>

      <ConversionModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}
