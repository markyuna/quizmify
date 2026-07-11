"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ImageDown, Share2, Loader2 } from "lucide-react";

import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import ShareResultCard, { type ShareResultCardProps } from "./ShareResultCard";

type ShareResultButtonProps = ShareResultCardProps & { compact?: boolean };

/**
 * Renders the shareable result card off-screen and rasterizes it with
 * html2canvas on demand -- chosen over a server-side image endpoint since
 * the app already has a fully-styled results DOM node to capture and no
 * existing raster-image pipeline, so this is the lowest-friction option for
 * this stack (see PDF export, which is the one thing we do generate
 * server-side, for contrast: that one needs a real document layout engine).
 */
export default function ShareResultButton({ compact = false, ...props }: ShareResultButtonProps) {
  const { toast } = useToast();
  const t = useTranslations("ShareResult");
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = React.useState<"download" | "share" | null>(null);
  const [canShareFiles, setCanShareFiles] = React.useState(false);

  React.useEffect(() => {
    setCanShareFiles(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function"
    );
  }, []);

  async function captureCanvas() {
    const { default: html2canvas } = await import("html2canvas");
    if (!cardRef.current) throw new Error("Share card not ready");
    return html2canvas(cardRef.current, { scale: 2, backgroundColor: null });
  }

  async function handleDownload() {
    setLoading("download");
    try {
      const canvas = await captureCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "quizmify-result.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast({ title: t("error"), description: t("unableToGenerate"), variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  async function handleShare() {
    setLoading("share");
    try {
      const canvas = await captureCanvas();
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not create image");

      const file = new File([blob], "quizmify-result.png", { type: "image/png" });

      if (!navigator.canShare({ files: [file] })) {
        throw new Error("File sharing not supported");
      }

      await navigator.share({
        files: [file],
        title: "Quizmify",
        text: t("shareText", { score: props.score, topic: props.topic }),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast({ title: t("error"), description: t("unableToShare"), variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  if (compact) {
    return (
      <>
        <div className="pointer-events-none fixed -left-[9999px] top-0" aria-hidden>
          <ShareResultCard ref={cardRef} {...props} />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={loading !== null}
              onClick={handleDownload}
              aria-label={t("downloadImage")}
              className="h-11 w-11 shrink-0 rounded-2xl"
            >
              {loading === "download" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ImageDown className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("downloadImage")}</TooltipContent>
        </Tooltip>

        {canShareFiles && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={loading !== null}
                onClick={handleShare}
                aria-label={t("share")}
                className="h-11 w-11 shrink-0 rounded-2xl"
              >
                {loading === "share" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Share2 className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("share")}</TooltipContent>
          </Tooltip>
        )}
      </>
    );
  }

  return (
    <>
      <div className="pointer-events-none fixed -left-[9999px] top-0" aria-hidden>
        <ShareResultCard ref={cardRef} {...props} />
      </div>

      <Button
        variant="outline"
        disabled={loading !== null}
        onClick={handleDownload}
        className="h-12 rounded-2xl"
      >
        {loading === "download" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ImageDown className="mr-2 h-4 w-4" />
        )}
        {t("downloadImage")}
      </Button>

      {canShareFiles && (
        <Button
          variant="outline"
          disabled={loading !== null}
          onClick={handleShare}
          className="h-12 rounded-2xl"
        >
          {loading === "share" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="mr-2 h-4 w-4" />
          )}
          {t("share")}
        </Button>
      )}
    </>
  );
}
