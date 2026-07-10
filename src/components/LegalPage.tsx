import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalContent = {
  title: string;
  updated: string;
  sections: LegalSection[];
};

function renderParagraph(paragraph: string) {
  return paragraph.split("\n").map((line, index, arr) => (
    <span key={index}>
      {line}
      {index < arr.length - 1 && <br />}
    </span>
  ));
}

export default function LegalPage({ content }: { content: LegalContent }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{content.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {content.updated}
          </p>

          {content.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, i) => (
                <p key={i}>{renderParagraph(paragraph)}</p>
              ))}
            </section>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
