import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/nextauth";
import { CERTIFICATE_INFO } from "@/lib/certificates";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificates = await prisma.certificate.findMany({
    where: { userId: session.user.id },
    orderBy: { earnedAt: "desc" },
  });

  return NextResponse.json({
    certificates: certificates.map((certificate) => ({
      id: certificate.id,
      kind: certificate.kind,
      topic: certificate.topic || null,
      earnedAt: certificate.earnedAt,
      title: CERTIFICATE_INFO[certificate.kind].title,
      description: CERTIFICATE_INFO[certificate.kind].description(certificate.topic),
    })),
  });
}
