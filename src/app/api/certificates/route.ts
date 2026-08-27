import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { getCertificateInfo } from "@/lib/certificates";
import { getRequestLocale } from "@/i18n/get-locale";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locale = await getRequestLocale();

  const certificates = await prisma.certificate.findMany({
    where: { userId: session.user.id },
    orderBy: { earnedAt: "desc" },
  });

  const results = await Promise.all(
    certificates.map(async (certificate) => {
      const info = await getCertificateInfo(certificate.kind, certificate.topic, locale);
      return {
        id: certificate.id,
        kind: certificate.kind,
        topic: certificate.topic || null,
        earnedAt: certificate.earnedAt,
        title: info.title,
        description: info.description,
      };
    })
  );

  return NextResponse.json({ certificates: results });
}
