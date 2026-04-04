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

export default function QuestionsList({ questions }: Props) {
  if (!questions?.length) {
    return (
      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        No questions available.
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-200 hover:bg-transparent dark:border-white/10">
            <TableHead className="w-14 text-slate-600 dark:text-slate-300">
              #
            </TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300">
              Question
            </TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300">
              Your Answer
            </TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300">
              Correct Answer
            </TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="text-base">
          {questions.map((q, i) => (
            <TableRow
              key={q.id}
              className="border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <TableCell className="align-top font-medium text-slate-700 dark:text-slate-200">
                {i + 1}
              </TableCell>

              <TableCell className="align-top text-slate-900 dark:text-slate-100">
                <div className="space-y-1">
                  <p>{q.question}</p>

                  {"explanation" in q &&
                    typeof q.explanation === "string" &&
                    q.explanation.trim().length > 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        💡 {q.explanation}
                      </p>
                    )}
                </div>
              </TableCell>

              <TableCell
                className={cn("align-top font-medium", {
                  "text-emerald-600 dark:text-emerald-400": q.isCorrect === true,
                  "text-rose-600 dark:text-rose-400": q.isCorrect === false,
                  "text-slate-500 dark:text-slate-300": q.isCorrect == null,
                })}
              >
                {q.userAnswer ?? "-"}
              </TableCell>

              <TableCell className="align-top font-medium text-emerald-600 dark:text-emerald-400">
                {q.answer}
              </TableCell>

              <TableCell className="align-top text-right">
                <span
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    {
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300":
                        q.isCorrect === true,
                      "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300":
                        q.isCorrect === false,
                      "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300":
                        q.isCorrect == null,
                    }
                  )}
                >
                  {q.isCorrect === true
                    ? "Correct"
                    : q.isCorrect === false
                    ? "Wrong"
                    : "Pending"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}