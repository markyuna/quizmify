import PDFDocument from "pdfkit";

export type CertificateData = {
  userName: string;
  achievementTitle: string;
  achievementDescription: string;
  earnedAt: Date;
};

const COLORS = {
  border: "#7c3aed",
  heading: "#1e1b4b",
  accent: "#7c3aed",
  body: "#334155",
  muted: "#64748b",
};

export function generateCertificatePdf(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { width, height } = doc.page;

    // Outer + inner decorative border, framing the whole page like a
    // physical certificate rather than the plain-text quiz export layout.
    doc.rect(24, 24, width - 48, height - 48).lineWidth(3).stroke(COLORS.border);
    doc.rect(34, 34, width - 68, height - 68).lineWidth(1).stroke(COLORS.accent);

    doc
      .fillColor(COLORS.accent)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("QUIZMIFY", 0, 70, { align: "center", characterSpacing: 4 });

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(12)
      .text("Certificate of Achievement", 0, 96, { align: "center", characterSpacing: 2 });

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(13)
      .text("This certifies that", 0, 160, { align: "center" });

    doc
      .fillColor(COLORS.heading)
      .font("Helvetica-Bold")
      .fontSize(34)
      .text(data.userName, 0, 190, { align: "center" });

    doc
      .fillColor(COLORS.body)
      .font("Helvetica")
      .fontSize(13)
      .text("has earned the achievement", 0, 245, { align: "center" });

    doc
      .fillColor(COLORS.accent)
      .font("Helvetica-Bold")
      .fontSize(24)
      .text(data.achievementTitle, 60, 275, { align: "center", width: width - 120 });

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica-Oblique")
      .fontSize(12)
      .text(data.achievementDescription, 100, 320, { align: "center", width: width - 200 });

    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(11)
      .text(formatDate(data.earnedAt), 0, height - 90, { align: "center" });

    doc.end();
  });
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
