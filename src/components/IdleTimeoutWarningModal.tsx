"use client";

import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

type Props = {
  open: boolean;
  secondsRemaining: number;
  onExtend: () => void;
};

export default function IdleTimeoutWarningModal({ open, secondsRemaining, onExtend }: Props) {
  const t = useTranslations("IdleTimeout");
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("warningTitle")}</DialogTitle>
          <DialogDescription>{t("warningBody")}</DialogDescription>
        </DialogHeader>

        <p className="text-center text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
          {display}
        </p>

        <DialogFooter>
          <Button onClick={onExtend} className="w-full sm:w-auto">
            {t("extendSession")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
