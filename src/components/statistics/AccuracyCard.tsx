import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Target } from "lucide-react";

type Props = { accuracy: number };

export default function AccuracyCard({ accuracy }: Props) {
  return (
    <Card className="md:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
          Accuracy
        </CardTitle>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
          <Target className="h-5 w-5" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold text-slate-900 dark:text-white">
          {accuracy}%
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Average success rate
        </p>
      </CardContent>
    </Card>
  );
}