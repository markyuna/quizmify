import PDFDocument from "pdfkit";

export type ExportVariant = "with-answers" | "without-answers";

export type ExportableQuestion = {
  question: string;
  options: string[];
  answer: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
  explanation: string | null;
};

export type ExportableGame = {
  topic: string;
  difficulty: string | null;
  timeStarted: Date;
  timeEnded: Date | null;
  score: number;
  questions: ExportableQuestion[];
};

const COLORS = {
  heading: "#1e1b4b",
  muted: "#64748b",
  body: "#0f172a",
  correct: "#15803d",
  incorrect: "#b91c1c",
};

export function generateQuizPdf(
  game: ExportableGame,
  variant: ExportVariant
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const withAnswers = variant === "with-answers";
    const correctCount = game.questions.filter((q) => q.isCorrect === true).length;

    // Header
    doc
      .fillColor(COLORS.heading)
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Quizmify", { continued: false });

    doc
      .fillColor(COLORS.body)
      .fontSize(16)
      .font("Helvetica-Bold")
      .text(game.topic, { paragraphGap: 4 });

    doc
      .fillColor(COLORS.muted)
      .fontSize(10)
      .font("Helvetica")
      .text(
        [
          formatDate(game.timeStarted),
          game.difficulty ? capitalize(game.difficulty) : null,
          withAnswers ? `Score: ${game.score}% (${correctCount}/${game.questions.length})` : null,
        ]
          .filter(Boolean)
          .join("   ·   ")
      );

    doc.moveDown(1.2);
    doc
      .strokeColor("#e2e8f0")
      .moveTo(doc.x, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(1);

    game.questions.forEach((q, index) => {
      doc
        .fillColor(COLORS.body)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(`${index + 1}. ${q.question}`, { paragraphGap: 4 });

      doc.font("Helvetica").fontSize(11);

      q.options.forEach((option) => {
        const isCorrectOption = withAnswers && option === q.answer;

        // Helvetica's standard PDF font uses WinAnsiEncoding, which has no
        // glyph for ✓/✗ (they render as mojibake). Stick to plain ASCII and
        // let color + the "Your answer" line below carry the distinction.
        const prefix = isCorrectOption ? " * " : "   ";
        const color = isCorrectOption ? COLORS.correct : COLORS.body;

        doc.fillColor(color).text(`${prefix}${option}`, { indent: 14 });
      });

      if (withAnswers && q.userAnswer && q.isCorrect === false) {
        doc
          .fillColor(COLORS.incorrect)
          .fontSize(10)
          .text(`Your answer: ${q.userAnswer}`, { indent: 14, paragraphGap: 2 });
      }

      if (withAnswers && q.explanation) {
        doc
          .fillColor(COLORS.muted)
          .fontSize(10)
          .font("Helvetica-Oblique")
          .text(`Explanation: ${q.explanation}`, { indent: 14 });
      }

      doc.moveDown(1);
    });

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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
