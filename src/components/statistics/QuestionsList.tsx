import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Question } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

type Props = {
  questions: Question[];
};

/**
 * Renders flush inside the statistics page's "Question review" card -- no
 * border/background of its own, so the card and the list read as a single
 * surface instead of a box nested in a box. Edge padding (px-4 / sm:px-6 /
 * md:px-8) mirrors the card header's so columns line up with the title.
 */
export default function QuestionsList({ questions }: Props) {
  const t = useTranslations("Statistics");

  if (!questions?.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        {t("noQuestionsAvailable")}
      </p>
    );
  }

  const statusLabel = (q: Question) =>
    q.isCorrect === true ? t("correct") : q.isCorrect === false ? t("wrong") : t("pending");

  return (
    <>
      {/* Desktop (lg+): one table, flush with the card edges. Below lg five
          columns get too cramped for long questions, so it switches to the
          stacked list. */}
      <div className="hidden lg:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.03]">
              <TableHead className="w-16 pl-8 text-slate-600 dark:text-slate-300">#</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-300">{t("question")}</TableHead>
              <TableHead className="w-[22%] text-slate-600 dark:text-slate-300">
                {t("yourAnswer")}
              </TableHead>
              <TableHead className="w-[22%] text-slate-600 dark:text-slate-300">
                {t("correctAnswer")}
              </TableHead>
              <TableHead className="w-32 pr-8 text-right text-slate-600 dark:text-slate-300">
                {t("status")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="text-base">
            {questions.map((q, i) => (
              <TableRow
                key={q.id}
                className="border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]"
              >
                <TableCell className="py-4 pl-8 align-top font-medium text-slate-500 dark:text-slate-400">
                  {i + 1}
                </TableCell>

                <TableCell className="px-3 py-4 align-top text-slate-900 dark:text-slate-100">
                  <QuestionText question={q} />
                </TableCell>

                <TableCell className={cn("px-3 py-4 align-top font-medium", userAnswerColor(q))}>
                  {q.userAnswer ?? "-"}
                </TableCell>

                <TableCell className="px-3 py-4 align-top font-medium text-emerald-600 dark:text-emerald-400">
                  {q.answer}
                </TableCell>

                <TableCell className="py-4 pr-8 text-right align-top">
                  <StatusBadge question={q} label={statusLabel(q)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile + tablet: same data as divided rows of the one card, not
          separate bordered cards inside it. */}
      <ol className="divide-y divide-slate-200 dark:divide-white/10 lg:hidden">
        {questions.map((q, i) => (
          <li key={q.id} className="px-4 py-5 sm:px-6 md:px-8">
            {/* Number + status share the top line so the question text below
                gets the full row width on narrow phones. */}
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {i + 1}
              </span>

              <StatusBadge question={q} label={statusLabel(q)} />
            </div>

            <div className="mt-3 text-slate-900 dark:text-slate-100">
              <QuestionText question={q} />
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/[0.04]">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t("yourAnswer")}
                </dt>
                <dd className={cn("mt-0.5 break-words font-medium", userAnswerColor(q))}>
                  {q.userAnswer ?? "-"}
                </dd>
              </div>

              <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/[0.04]">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t("correctAnswer")}
                </dt>
                <dd className="mt-0.5 break-words font-medium text-emerald-600 dark:text-emerald-400">
                  {q.answer}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </>
  );
}

function userAnswerColor(q: Question) {
  return cn({
    "text-emerald-600 dark:text-emerald-400": q.isCorrect === true,
    "text-rose-600 dark:text-rose-400": q.isCorrect === false,
    "text-slate-500 dark:text-slate-300": q.isCorrect == null,
  });
}

function QuestionText({ question: q }: { question: Question }) {
  const explanation = typeof q.explanation === "string" ? q.explanation.trim() : "";

  return (
    <div className="space-y-1 break-words">
      <p>{q.question}</p>
      {explanation.length > 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">💡 {explanation}</p>
      )}
    </div>
  );
}

function StatusBadge({ question: q, label }: { question: Question; label: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold", {
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300":
          q.isCorrect === true,
        "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300": q.isCorrect === false,
        "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300": q.isCorrect == null,
      })}
    >
      {label}
    </span>
  );
}
