import { Award, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CertificateDownloadButton from "@/components/CertificateDownloadButton";
import { prisma } from "@/lib/db";
import { isUserPro } from "@/lib/paywall";
import { getCertificateInfo } from "@/lib/certificates";
import { getRequestLocale } from "@/i18n/get-locale";

export default async function CertificatesCard({ userId }: { userId: string }) {
  const t = await getTranslations("Certificates");
  const locale = await getRequestLocale();

  const [certificates, isPro] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
    }),
    isUserPro(userId),
  ]);

  const certificateInfos = await Promise.all(
    certificates.map((certificate) => getCertificateInfo(certificate.kind, certificate.topic, locale))
  );

  return (
    <Card className="relative h-full overflow-hidden rounded-[1.75rem] border-white/10 bg-white/60 shadow-xl shadow-black/5 transition-all duration-300 hover:scale-[1.01] dark:bg-white/5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-violet-500/10" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <CardHeader className="relative z-10 p-4 pb-3 sm:p-6 sm:pb-4">
        <div className="space-y-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/5 sm:text-xs">
            <Award className="h-3.5 w-3.5 text-fuchsia-400" />
            {t("badge")}
          </div>

          <div className="min-w-0">
            <CardTitle className="text-lg font-bold sm:text-xl">{t("title")}</CardTitle>
            <CardDescription className="text-sm leading-6">
              {certificates.length === 0
                ? t("emptySubtitle")
                : t("countLabel", { count: certificates.length })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-4 pt-0 sm:p-6 sm:pt-0">
        {certificates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-dashed border-white/20 bg-white/40 px-4 py-8 text-center dark:bg-white/5">
            <Award className="h-8 w-8 text-fuchsia-300" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("emptyTitle")}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">{t("emptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {certificates.map((certificate, index) => {
              const info = certificateInfos[index];
              return (
                <div
                  key={certificate.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/50 p-3 backdrop-blur-xl dark:bg-white/5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-fuchsia-400/20 to-violet-400/20">
                      <Award className="h-5 w-5 text-fuchsia-500 dark:text-fuchsia-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {info.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {info.description}
                      </p>
                    </div>
                  </div>

                  {isPro ? (
                    <CertificateDownloadButton certificateId={certificate.id} kind={certificate.kind} />
                  ) : (
                    <div className="flex shrink-0 items-center gap-1 rounded-xl border border-amber-200/60 bg-amber-50/60 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                      <Lock className="h-3 w-3" />
                      {t("proOnly")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
