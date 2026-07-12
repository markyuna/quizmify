"use client";

import * as React from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, Lock } from "lucide-react";

import { useToast } from "./ui/use-toast";
import { cn } from "@/lib/utils";
import { AVATAR_SKINS } from "@/lib/avatarSkins";

type AvatarSkinSelectorProps = {
  isPro: boolean;
  selectedSkinId: string | null;
};

function SkinSwatch({ primaryColor, accentColor }: { primaryColor: string; accentColor: string }) {
  return (
    <div
      className="h-12 w-12 rounded-full shadow-inner"
      style={{ background: `radial-gradient(circle at 35% 30%, ${accentColor}, ${primaryColor})` }}
    />
  );
}

export default function AvatarSkinSelector({ isPro, selectedSkinId }: AvatarSkinSelectorProps) {
  const t = useTranslations("Account");
  const router = useRouter();
  const { toast } = useToast();
  const [optimisticSkinId, setOptimisticSkinId] = React.useState(selectedSkinId);

  const { mutate: selectSkin, isPending } = useMutation({
    mutationFn: async (skinId: string | null) => axios.post("/api/avatar/skin", { skinId }),
    onSuccess: (_data, skinId) => {
      setOptimisticSkinId(skinId);
      router.refresh();
    },
    onError: () => toast({ title: t("somethingWentWrong"), variant: "destructive" }),
  });

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("skinSelectorTitle")}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {isPro ? t("skinSelectorSubtitlePro") : t("skinSelectorSubtitleFree")}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
        <button
          type="button"
          disabled={isPending}
          onClick={() => selectSkin(null)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl p-2 transition disabled:opacity-60",
            optimisticSkinId === null
              ? "bg-violet-50 ring-2 ring-violet-400 dark:bg-violet-500/10"
              : "hover:bg-slate-50 dark:hover:bg-white/5"
          )}
        >
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-slate-300 dark:border-white/20">
            {optimisticSkinId === null && <Check className="h-4 w-4 text-violet-500" />}
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t("skinDefault")}</span>
        </button>

        {AVATAR_SKINS.map((skin) => {
          const isSelected = optimisticSkinId === skin.id;
          const locked = !isPro;

          return (
            <button
              key={skin.id}
              type="button"
              disabled={isPending || locked}
              onClick={() => selectSkin(skin.id)}
              aria-label={skin.name}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl p-2 transition disabled:cursor-not-allowed",
                isSelected
                  ? "bg-violet-50 ring-2 ring-violet-400 dark:bg-violet-500/10"
                  : "hover:bg-slate-50 dark:hover:bg-white/5",
                locked && "opacity-50 hover:bg-transparent dark:hover:bg-transparent"
              )}
            >
              <div className="relative">
                <SkinSwatch primaryColor={skin.primaryColor} accentColor={skin.accentColor} />
                {locked && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white shadow dark:bg-slate-600">
                    <Lock className="h-2.5 w-2.5" />
                  </span>
                )}
                {isSelected && !locked && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white shadow">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{skin.name}</span>
            </button>
          );
        })}
      </div>

      {!isPro && (
        <Link
          href="/upgrade"
          className="mt-3 inline-block text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
        >
          {t("skinUnlockCta")}
        </Link>
      )}
    </div>
  );
}
