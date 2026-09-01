"use client";

import * as React from "react";
import axios from "axios";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { NEURON_PACKAGES, NEURON_PACKAGE_KEYS, type NeuronPackageKey } from "@/lib/neurons/shop";

const POPULAR_KEY: NeuronPackageKey = "LARGE";

/**
 * The Neuron package grid. Posts to /api/checkout/neurons and hands the
 * browser off to Stripe Checkout. Rendered above the ledger on
 * /history?tab=neurons; safe to drop anywhere else that needs a buy CTA.
 */
export default function NeuronsShop() {
  const t = useTranslations("NeuronsShop");
  const locale = useLocale();
  const { toast } = useToast();
  const [pending, setPending] = React.useState<NeuronPackageKey | null>(null);

  const eur = React.useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }),
    [locale]
  );

  async function buy(key: NeuronPackageKey) {
    setPending(key);
    try {
      const res = await axios.post<{ url?: string }>("/api/checkout/neurons", { packageKey: key });
      if (res.data.url) {
        // Keep the spinner up through the redirect.
        window.location.href = res.data.url;
        return;
      }
      throw new Error("Checkout response had no url");
    } catch (error) {
      console.error("Neuron checkout failed:", error);
      toast({ title: t("errorTitle"), description: t("errorDescription"), variant: "destructive" });
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="neurons-shop-heading">
      <h2
        id="neurons-shop-heading"
        className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {t("title")}
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {NEURON_PACKAGE_KEYS.map((key) => {
          const pkg = NEURON_PACKAGES[key];
          const popular = key === POPULAR_KEY;

          return (
            <div
              key={key}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center",
                popular
                  ? "border-violet-400 bg-violet-50 dark:border-violet-500/40 dark:bg-violet-500/10"
                  : "border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/5"
              )}
            >
              {popular && (
                <span className="absolute -top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {t("popular")}
                </span>
              )}

              <span className="flex items-center gap-1 text-xl font-black text-violet-600 dark:text-violet-300">
                <Image src="/icono-neurona/neurona-hex-48.png" alt="" width={18} height={18} />
                {pkg.neurons}
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {eur.format(pkg.amountCents / 100)}
              </span>

              <Button
                type="button"
                size="sm"
                variant={popular ? "default" : "outline"}
                onClick={() => buy(key)}
                disabled={pending !== null}
                className="w-full"
              >
                {pending === key ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  t("buy")
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
