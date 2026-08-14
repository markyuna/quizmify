"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Flame, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import LoginButton from "@/components/LoginButton";
import { Button } from "@/components/ui/button";

type ConversionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Lets callers outside the 3 daily games (e.g. the personality test,
  // whose result isn't a streak) point at their own copy instead of
  // "reveal today's result / start your streak" -- must resolve title,
  // description, createWithEmail, alreadyHaveAccount, signInLink.
  namespace?: string;
};

/**
 * Shown the moment a guest finishes their one daily attempt at any of the 3
 * games, before the result is revealed. Registering here (Google or email)
 * is the only way to see it -- GuestRoundClaim.tsx (mounted in the root
 * layout) picks up the guest attempt via its cookie and applies it to the
 * new account automatically once auth completes, on whichever page that
 * lands on. Closing this modal loses nothing: the guest's cookie and the
 * already-graded GuestAttempt row are both still there next time they
 * register, from this same browser.
 */
export default function ConversionModal({ open, onOpenChange, namespace = "GuestGames.conversionModal" }: ConversionModalProps) {
  const t = useTranslations(namespace);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 shadow-lg shadow-violet-500/30">
            <Flame className="h-7 w-7 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">{t("title")}</DialogTitle>
          <DialogDescription className="text-center">{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <LoginButton />

          <Link href="/register">
            <Button variant="outline" className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              {t("createWithEmail")}
            </Button>
          </Link>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
              {t("signInLink")}
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
