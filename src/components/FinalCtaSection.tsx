"use client";

import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

type FinalCtaSectionProps = {
  isAuthenticated: boolean;
};

export default function FinalCtaSection({ isAuthenticated }: FinalCtaSectionProps) {
  const t = useTranslations("Home");

  return (
    <MotionConfig reducedMotion="user">
      <section className="px-4 pb-20 pt-8 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 p-8 text-center shadow-2xl shadow-violet-500/20 md:p-12"
        >
          {/* Slow shine sweep across the whole block, not just a button --
              subtle, low-opacity, same animate-shine keyframe as the hero CTAs. */}
          <span
            aria-hidden
            className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/10 motion-reduce:hidden"
          />

          <div className="relative">
            <h2 className="text-3xl font-bold text-white md:text-4xl">{t("ctaTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/85">
              {t("ctaBody")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="xl"
                variant="secondary"
                className="bg-white text-slate-900 transition-transform duration-200 hover:scale-[1.03] hover:bg-white/90 hover:shadow-xl"
              >
                <Link href={isAuthenticated ? "/quiz" : "/login"}>
                  {isAuthenticated ? t("ctaCreateNext") : t("ctaStartNow")}
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="ghost"
                className="group gap-1.5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/history">
                  {t("ctaSeeProgress")}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </MotionConfig>
  );
}
