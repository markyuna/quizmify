"use client";

import * as React from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, FileCheck2, FileText, Loader2 } from "lucide-react";

import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { ExportVariant } from "@/lib/pdf/quiz-export";

type ExportPdfButtonProps = {
  gameId: string;
  compact?: boolean;
};

export default function ExportPdfButton({ gameId, compact = false }: ExportPdfButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("ExportPdf");
  const [loadingVariant, setLoadingVariant] = React.useState<ExportVariant | null>(null);

  async function handleExport(variant: ExportVariant) {
    setLoadingVariant(variant);

    try {
      const response = await axios.get(`/api/quiz/${gameId}/export`, {
        params: { variant },
        responseType: "blob",
      });

      const blobUrl = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `quizmify-${variant}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast({
          title: t("proRequiredTitle"),
          description: t("proRequiredDescription"),
          variant: "destructive",
        });
        router.push("/upgrade");
        return;
      }

      toast({
        title: t("errorTitle"),
        description: t("errorDescription"),
        variant: "destructive",
      });
    } finally {
      setLoadingVariant(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon"
            disabled={loadingVariant !== null}
            aria-label={t("exportToPdf")}
            className="h-8 w-8 shrink-0 rounded-xl"
          >
            {loadingVariant ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={loadingVariant !== null}
            className="h-12 rounded-2xl"
          >
            {loadingVariant ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {t("exportToPdf")}
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-64 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90"
      >
        <DropdownMenuItem
          onSelect={() => handleExport("with-answers")}
          className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <FileCheck2 className="mr-2 h-4 w-4" />
          <div>
            <p>{t("withAnswers")}</p>
            <p className="text-xs font-normal text-slate-400">{t("withAnswersDesc")}</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => handleExport("without-answers")}
          className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <FileText className="mr-2 h-4 w-4" />
          <div>
            <p>{t("withoutAnswers")}</p>
            <p className="text-xs font-normal text-slate-400">{t("withoutAnswersDesc")}</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
