import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

type Props = { accuracy: number };

export default function ResultsCard({ accuracy }: Props) {
  let label = "";
  let scoreColor = "";
  let badgeClasses = "";
  let emoji = "";

  if (accuracy >= 75) {
    label = "Excellent";
    scoreColor = "text-amber-600 dark:text-yellow-400";
    badgeClasses =
      "bg-amber-100 text-amber-700 dark:bg-yellow-500/15 dark:text-yellow-300";
    emoji = "🏆";
  } else if (accuracy >= 50) {
    label = "Good job";
    scoreColor = "text-violet-600 dark:text-violet-400";
    badgeClasses =
      "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";
    emoji = "👏";
  } else {
    label = "Keep practicing";
    scoreColor = "text-rose-600 dark:text-rose-400";
    badgeClasses =
      "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    emoji = "💪";
  }

  return (
    <Card className="text-center md:col-span-7">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
          Results
        </CardTitle>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
          <Trophy className="h-5 w-5" />
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center gap-4 py-10">
        <div className="text-5xl leading-none">{emoji}</div>

        <div className={`text-3xl font-bold ${scoreColor}`}>{accuracy}%</div>

        <span
          className={`inline-flex rounded-full px-4 py-1.5 text-sm font-semibold ${badgeClasses}`}
        >
          {label}
        </span>
      </CardContent>
    </Card>
  );
}