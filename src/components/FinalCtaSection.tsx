"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import { ArrowRight, PawPrint } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ANIMAL_KEYS, QUEL_ANIMAL_ES_TU_IMAGES } from "@/lib/personalityTests/quelAnimalEsTu.config";

type FinalCtaSectionProps = {
  hasMascot: boolean;
};

// Position/timing per floating mascot -- distinct duration/delay per animal
// so the 6 bob independently instead of looking like one synced group.
// Positioned inside the card's own padding (not overflowing its edges), so
// they never get clipped by the shine sweep's overflow-hidden container.
const FLOATING_MASCOTS: { key: (typeof ANIMAL_KEYS)[number]; className: string; duration: number; delay: number; rotate: number }[] = [
  { key: "lion", className: "left-2 top-3 sm:left-6 sm:top-6", duration: 4.5, delay: 0, rotate: 4 },
  { key: "dauphin", className: "right-2 top-1 sm:right-8 sm:top-4", duration: 5.2, delay: 0.4, rotate: -5 },
  { key: "hibou", className: "right-1 top-1/2 -translate-y-1/2 sm:right-2", duration: 4.8, delay: 0.8, rotate: 3 },
  { key: "renard", className: "right-4 bottom-2 sm:right-10 sm:bottom-6", duration: 5.6, delay: 1.2, rotate: -4 },
  { key: "loup", className: "left-4 bottom-2 sm:left-10 sm:bottom-6", duration: 5.0, delay: 0.2, rotate: 5 },
  { key: "ours", className: "left-1 top-1/2 -translate-y-1/2 sm:left-2", duration: 4.6, delay: 0.6, rotate: -3 },
];

export default function FinalCtaSection({ hasMascot }: FinalCtaSectionProps) {
  const t = useTranslations("Home");

  const primaryHref = hasMascot ? "/dashboard" : "/quel-animal-es-tu";
  const primaryLabel = hasMascot ? t("ctaViewMascot") : t("ctaCreateMascot");

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

          {/* Decorative only -- alt="" and aria-hidden so screen readers
              don't get 6 unlabeled images with no informational content. */}
          {FLOATING_MASCOTS.map(({ key, className, duration, delay, rotate }) => (
            <motion.div
              key={key}
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute h-11 w-11 overflow-hidden rounded-full border-2 border-white/50 shadow-lg sm:h-16 sm:w-16",
                className
              )}
              animate={{ y: [0, -10, 0], rotate: [0, rotate, 0] }}
              transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
            >
              <Image src={QUEL_ANIMAL_ES_TU_IMAGES[key]} alt="" fill className="object-cover" sizes="64px" />
            </motion.div>
          ))}

          <div className="relative">
            <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white backdrop-blur">
              <PawPrint className="h-3.5 w-3.5" />
              {t("ctaBadge")}
            </div>

            <h2 className="text-3xl font-bold text-white md:text-4xl">{t("ctaMascotTitle")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/85">{t("ctaMascotBody")}</p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="xl"
                variant="secondary"
                className="bg-white text-slate-900 transition-transform duration-200 hover:scale-[1.03] hover:bg-white/90 hover:shadow-xl"
              >
                <Link href={primaryHref}>{primaryLabel}</Link>
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
