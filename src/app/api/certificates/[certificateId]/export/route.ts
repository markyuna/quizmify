import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { isUserPro } from "@/lib/paywall";
import { getCertificateInfo } from "@/lib/certificates";
import { generateCertificatePdf } from "@/lib/pdf/certificate-export";
import { getRequestLocale } from "@/i18n/get-locale";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ certificateId: string }>;
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "certificate"
  );
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Certificates are a Pro-only perk, same gate as quiz PDF export.
  if (!(await isUserPro(session.user.id))) {
    return NextResponse.json({ error: "PRO_REQUIRED" }, { status: 403 });
  }

  const { certificateId } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
  });

  if (!certificate || certificate.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const locale = await getRequestLocale();
  const info = await getCertificateInfo(certificate.kind, certificate.topic, locale);

  const pdfBuffer = await generateCertificatePdf({
    userName: session.user.name?.trim() || "Quizmify Learner",
    achievementTitle: info.title,
    achievementDescription: info.description,
    achievementKind: certificate.kind,
    earnedAt: certificate.earnedAt,
    locale,
  });

  const filename = `quizmify-certificate-${slugify(certificate.kind)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
