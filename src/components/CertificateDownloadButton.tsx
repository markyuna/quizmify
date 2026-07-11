"use client";

import * as React from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Loader2 } from "lucide-react";

import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";

type CertificateDownloadButtonProps = {
  certificateId: string;
  kind: string;
};

export default function CertificateDownloadButton({
  certificateId,
  kind,
}: CertificateDownloadButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("Certificates");
  const [loading, setLoading] = React.useState(false);

  async function handleDownload() {
    setLoading(true);

    try {
      const response = await axios.get(`/api/certificates/${certificateId}/export`, {
        responseType: "blob",
      });

      const blobUrl = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `quizmify-certificate-${kind}.pdf`;
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
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={handleDownload}
      className="h-9 shrink-0 rounded-xl"
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="mr-1.5 h-3.5 w-3.5" />
      )}
      {t("download")}
    </Button>
  );
}
