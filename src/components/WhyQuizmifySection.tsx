"use client";

import { motion, MotionConfig, type Variants } from "framer-motion";
import { useTranslations } from "next-intl";

const STATS = [
  { labelKey: "statSetupLabel", valueKey: "statSetupValue" },
  { labelKey: "statReviewLabel", valueKey: "statReviewValue" },
  { labelKey: "statPracticeLabel", valueKey: "statPracticeValue" },
  { labelKey: "statRewardsLabel", valueKey: "statRewardsValue" },
] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function WhyQuizmifySection() {
  const t = useTranslations("Home");

  return (
    <MotionConfig reducedMotion="user">
      <section className="px-4 py-8 md:px-8 md:py-16">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={container}
          className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none md:p-12"
        >
          {/* Subtle decorative corner glow -- contained by the section's own
              overflow-hidden, never spilling onto neighboring sections. */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/10" />

          <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
            <motion.div variants={item}>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
                {t("whyBadge")}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl dark:text-white">
                {t("whyTitle")}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
                {t("whyBody")}
              </p>
              <p className="mt-4 inline-flex max-w-2xl items-center rounded-full border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-4 py-2 text-sm font-medium text-violet-700 dark:border-violet-500/20 dark:from-violet-500/10 dark:to-fuchsia-500/10 dark:text-violet-300">
                {t("whyNeuronsHighlight")}
              </p>
            </motion.div>

            <motion.div variants={item} className="grid gap-3 sm:grid-cols-2">
              {STATS.map(({ labelKey, valueKey }) => (
                <div
                  key={labelKey}
                  className="rounded-2xl border border-transparent bg-slate-50 p-4 transition-colors duration-200 hover:border-violet-200 hover:bg-violet-50/60 dark:bg-white/5 dark:hover:border-violet-500/20 dark:hover:bg-white/10"
                >
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t(labelKey)}</p>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white"
                  >
                    {t(valueKey)}
                  </motion.p>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>
    </MotionConfig>
  );
}
