import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hourglass } from "lucide-react";
import { differenceInSeconds } from "date-fns";
import { formatTimeDelta } from "@/lib/utils";

type Props = {
  timeEnded: Date;
  timeStarted: Date;
};

export default function TimeTakenCard({ timeEnded, timeStarted }: Props) {
  const seconds = differenceInSeconds(timeEnded, timeStarted);

  return (
    <Card className="md:col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
          Time Taken
        </CardTitle>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400">
          <Hourglass className="h-5 w-5" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold text-slate-900 dark:text-white">
          {formatTimeDelta(seconds)}
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Total duration of the quiz
        </p>
      </CardContent>
    </Card>
  );
}