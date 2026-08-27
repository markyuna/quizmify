import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { getTranslations } from "next-intl/server";

import type { CertificateKind } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/locales";

export type CertificateData = {
  userName: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementKind: CertificateKind;
  earnedAt: Date;
  locale: Locale;
};

const COLORS = {
  border: "#7c3aed",
  heading: "#1e1b4b",
  accent: "#7c3aed",
  body: "#334155",
  muted: "#64748b",
};

const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");

function medalPath(kind: CertificateKind): string {
  return path.join(process.cwd(), "public", "certificates", `medal-${kind}.png`);
}

/**
 * Draws an image only if the file actually exists, and never lets a
 * missing/corrupt asset take the whole certificate down with it -- the
 * medal PNGs in particular are supplied separately from this code (see
 * public/certificates/medal-{kind}.png) and may not have landed yet.
 */
function tryDrawImage(doc: PDFKit.PDFDocument, filePath: string, x: number, y: number, options: { width: number; height?: number }) {
  try {
    if (!fs.existsSync(filePath)) return false;
    doc.image(filePath, x, y, options);
    return true;
  } catch (error) {
    console.error(`[certificate-export] failed to draw image "${filePath}":`, error);
    return false;
  }
}

export async function generateCertificatePdf(data: CertificateData): Promise<Buffer> {
  const t = await getTranslations({ locale: data.locale, namespace: "Certificates.pdf" });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { width, height } = doc.page;

    // Diagonal violet -> coral gradient, deliberately light at the midpoint
    // (not just a 2-stop blend, which would muddy into a grey-violet at the
    // center) so the dark body text drawn over it stays legible without a
    // separate white panel.
    const gradient = doc.linearGradient(0, 0, width, height);
    gradient.stop(0, "#7c3aed").stop(0.5, "#fdf7fb").stop(1, "#fb7185");
    doc.rect(0, 0, width, height).fill(gradient);

    // Watermark: the real logo, very low opacity, centered behind everything.
    doc.opacity(0.05);
    const watermarkSize = height * 0.55;
    tryDrawImage(doc, LOGO_PATH, width / 2 - watermarkSize / 2, height / 2 - watermarkSize / 2, {
      width: watermarkSize,
    });
    doc.opacity(1);

    // Single fine frame instead of the old thick double border.
    const margin = 30;
    doc.rect(margin, margin, width - margin * 2, height - margin * 2).lineWidth(1).stroke(COLORS.border);

    // Header: real logo + wordmark.
    const logoSize = 34;
    tryDrawImage(doc, LOGO_PATH, width / 2 - logoSize / 2, 46, { width: logoSize });

    doc
      .fillColor(COLORS.accent)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("QUIZMIFY", 0, 46 + logoSize + 8, { align: "center", characterSpacing: 4 });

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(11)
      .text(t("badgeLabel"), 0, 46 + logoSize + 28, { align: "center", characterSpacing: 2 });

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(13)
      .text(t("certifiesThat"), 0, 175, { align: "center" });

    doc
      .fillColor(COLORS.heading)
      .font("Times-Bold")
      .fontSize(34)
      .text(data.userName, 0, 202, { align: "center" });

    doc
      .fillColor(COLORS.body)
      .font("Helvetica")
      .fontSize(13)
      .text(t("hasEarned"), 0, 256, { align: "center" });

    // Medal, keyed to the achievement kind -- sits just above the
    // achievement title so the two read as one unit.
    const medalSize = 52;
    const medalDrawn = tryDrawImage(
      doc,
      medalPath(data.achievementKind),
      width / 2 - medalSize / 2,
      278,
      { width: medalSize }
    );

    const titleY = medalDrawn ? 278 + medalSize + 10 : 288;

    doc
      .fillColor(COLORS.accent)
      .font("Times-Bold")
      .fontSize(24)
      .text(data.achievementTitle, 60, titleY, { align: "center", width: width - 120 });

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica-Oblique")
      .fontSize(12)
      .text(data.achievementDescription, 100, titleY + 40, { align: "center", width: width - 200 });

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(11)
      .text(formatDate(data.earnedAt, data.locale), 0, height - 90, { align: "center" });

    doc.end();
  });
}

function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
