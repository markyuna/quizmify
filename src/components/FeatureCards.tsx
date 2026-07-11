"use client";

import { motion, MotionConfig, type Variants } from "framer-motion";
import { BrainCircuit, BarChart3, RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: BrainCircuit,
    titleKey: "featureAiTitle",
    bodyKey: "featureAiBody",
    iconBg: "bg-violet-100 dark:bg-violet-500/15",
    iconText: "text-violet-600 dark:text-violet-300",
  },
  {
    icon: BarChart3,
    titleKey: "featureTrackTitle",
    bodyKey: "featureTrackBody",
    iconBg: "bg-cyan-100 dark:bg-cyan-500/15",
    iconText: "text-cyan-600 dark:text-cyan-300",
  },
  {
    icon: RefreshCcw,
    titleKey: "featureMistakesTitle",
    bodyKey: "featureMistakesBody",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
    iconText: "text-emerald-600 dark:text-emerald-300",
  },
] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function FeatureCards() {
  const t = useTranslations("Home");

  return (
    <MotionConfig reducedMotion="user">
      <section className="px-4 py-10 md:px-8 md:py-16">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={container}
          className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3"
        >
          {FEATURES.map(({ icon: Icon, titleKey, bodyKey, iconBg, iconText }) => (
            <motion.div
              key={titleKey}
              variants={item}
              className="group rounded-3xl transition-transform duration-300 hover:-translate-y-1.5"
            >
              <Card className="h-full border-slate-200/80 shadow-sm transition-shadow duration-300 group-hover:shadow-xl dark:border-white/10">
                <CardContent className="p-5">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${iconBg} ${iconText}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{t(titleKey)}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">{t(bodyKey)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </MotionConfig>
  );
}
