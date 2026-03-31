import { Card } from "@/components/ui/card";
import { Percent, Target } from "lucide-react";

type OpenEndedPercentageProps = {
  percentage: number;
};

export default function OpenEndedPercentage({
  percentage,
}: OpenEndedPercentageProps) {
  return (
    <Card className="flex flex-row items-center gap-3 p-3">
      <Target className="h-7 w-7" />
      <span className="text-2xl font-semibold opacity-80">
        {Math.round(percentage)}
      </span>
      <Percent className="h-6 w-6 opacity-80" />
    </Card>
  );
}