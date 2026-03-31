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
        <CardTitle className="text-xl font-semibold">
          Time Taken
        </CardTitle>
        <Hourglass />
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold">
          {formatTimeDelta(seconds)}
        </div>
        <p className="text-sm text-muted-foreground">
          Total duration of the quiz
        </p>
      </CardContent>
    </Card>
  );
}