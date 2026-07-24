"use client";

import React from "react";
import { BarChart3, Brain, HelpCircle, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const DetailsDialog = () => {
  const t = useTranslations("DetailsDialog");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center rounded-md bg-slate-800 px-2 py-1 text-white">
          {t("whatIsThis")}
          <HelpCircle className="ml-1 h-5 w-5" />
        </button>
      </DialogTrigger>

      <DialogContent className="w-[70vw] max-w-[100vw] md:w-[50vw]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("title")}</DialogTitle>

          <DialogDescription asChild>
            <div>
              <p className="my-4 text-base text-slate-700 dark:text-slate-300">
                {t("intro")}
              </p>

              <div className="space-y-4 my-6">
                {[
                  {
                    icon: Brain,
                    title: t("feature1_title"),
                    desc: t("feature1_desc"),
                  },
                  {
                    icon: BarChart3,
                    title: t("feature2_title"),
                    desc: t("feature2_desc"),
                  },
                  {
                    icon: Trophy,
                    title: t("feature3_title"),
                    desc: t("feature3_desc"),
                  },
                ].map(({ icon: Icon, title, desc }, idx) => (
                  <div key={idx} className="flex gap-3">
                    <Icon className="h-5 w-5 shrink-0 text-violet-500 dark:text-violet-400 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <DialogTrigger asChild>
                  <button className="w-full rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 px-4 transition-colors">
                    {t("cta")}
                  </button>
                </DialogTrigger>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default DetailsDialog;