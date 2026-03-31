import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

type Props = { accuracy: number };

export default function ResultsCard({ accuracy }: Props) {
  let label = "";
  let color = "";
  let emoji = "";

  if (accuracy >= 75) {
    label = "Excellent";
    color = "text-yellow-500";
    emoji = "🏆";
  } else if (accuracy >= 50) {
    label = "Good job";
    color = "text-slate-400";
    emoji = "👏";
  } else {
    label = "Keep practicing";
    color = "text-red-400";
    emoji = "💪";
  }

  return (
    <Card className="md:col-span-7 text-center">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-2xl font-bold">Results</CardTitle>
        <Trophy className="h-6 w-6" />
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center gap-3 py-10">
        <div className="text-5xl">{emoji}</div>

        <div className={`text-3xl font-bold ${color}`}>
          {accuracy}%
        </div>

        <p className="text-lg font-medium">{label}</p>
      </CardContent>
    </Card>
  );
}