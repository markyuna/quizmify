"use client";

import * as React from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Bell, Flame, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "./ui/use-toast";

type NotificationPreferences = {
  streakReminderEmail: boolean;
  dailyChallengeEmail: boolean;
  weeklySummaryEmail: boolean;
};

const TOGGLES: {
  key: keyof NotificationPreferences;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  descKey: string;
}[] = [
  { key: "streakReminderEmail", icon: Flame, labelKey: "streakReminderLabel", descKey: "streakReminderDesc" },
  {
    key: "dailyChallengeEmail",
    icon: Trophy,
    labelKey: "dailyChallengeReminderLabel",
    descKey: "dailyChallengeReminderDesc",
  },
  { key: "weeklySummaryEmail", icon: Bell, labelKey: "weeklySummaryLabel", descKey: "weeklySummaryDesc" },
];

export default function NotificationPreferencesCard() {
  const t = useTranslations("Account");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await axios.get<NotificationPreferences>("/api/notifications/preferences");
      return res.data;
    },
  });

  const { mutate: updatePreference, isPending } = useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      const res = await axios.patch<NotificationPreferences>("/api/notifications/preferences", patch);
      return res.data;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["notification-preferences"] });
      const previous = queryClient.getQueryData<NotificationPreferences>(["notification-preferences"]);
      if (previous) {
        queryClient.setQueryData(["notification-preferences"], { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notification-preferences"], context.previous);
      }
      toast({ title: t("somethingWentWrong"), variant: "destructive" });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["notification-preferences"], updated);
    },
  });

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("notificationsTitle")}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("notificationsSubtitle")}</p>

      <div className="mt-3 space-y-2">
        {TOGGLES.map(({ key, icon: Icon, labelKey, descKey }) => {
          const checked = data?.[key] ?? true;

          return (
            <button
              key={key}
              type="button"
              disabled={isLoading || isPending}
              onClick={() => updatePreference({ [key]: !checked } as Partial<NotificationPreferences>)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/60 p-3 text-left transition disabled:opacity-60 dark:border-white/10 dark:bg-white/5"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                    {t(labelKey)}
                  </span>
                  <span className="block truncate text-xs text-slate-400">{t(descKey)}</span>
                </span>
              </span>

              <span
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
                  checked ? "bg-violet-500" : "bg-slate-300 dark:bg-white/20"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                    checked ? "translate-x-[22px]" : "translate-x-0.5"
                  )}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
