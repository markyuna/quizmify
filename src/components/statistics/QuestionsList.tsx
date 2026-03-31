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
      <p className="mt-4 text-center text-slate-300">
        No questions available.
      </p>
    );
  }

  const gameType = questions[0]?.questionType;

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className=" border-white/10 hover:bg-transparent">
            <TableHead className="w-14">#</TableHead>
            <TableHead>Question</TableHead>
            <TableHead>Your Answer</TableHead>
            <TableHead>Correct Answer</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="text-lg">
          {questions.map((q, i) => (
            <TableRow
              key={q.id}
              className="border-white/10 hover:bg-white/5"
            >
              <TableCell className="align-top font-medium">
                {i + 1}
              </TableCell>

              <TableCell className="align-top text-slate-100">
                <div className="space-y-1">
                  <p>{q.question}</p>

                  {"explanation" in q &&
                    typeof q.explanation === "string" &&
                    q.explanation.trim().length > 0 && (
                      <p className="text-sm text-slate-400">
                        💡 {q.explanation}
                      </p>
                    )}
                </div>
              </TableCell>

              <TableCell
                className={cn("align-top font-medium", {
                  "text-emerald-400": q.isCorrect === true,
                  "text-rose-400": q.isCorrect === false,
                  "text-slate-300": q.isCorrect == null,
                })}
              >
                {q.userAnswer ?? "-"}
              </TableCell>

              <TableCell className="align-top font-medium text-emerald-400">
                {q.answer}
              </TableCell>

              <TableCell className="align-top text-right">
                <span
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                    {
                      "bg-emerald-500/15 text-emerald-300":
                        q.isCorrect === true,
                      "bg-rose-500/15 text-rose-300":
                        q.isCorrect === false,
                      "bg-white/10 text-slate-300": q.isCorrect == null,
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