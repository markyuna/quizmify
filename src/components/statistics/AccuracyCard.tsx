import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Target } from "lucide-react";

type Props = { accuracy: number };

export default function AccuracyCard({ accuracy }: Props) {
  return (
    <Card className="md:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-semibold">
          Accuracy
        </CardTitle>
        <Target />
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold">{accuracy}%</div>
        <p className="text-sm text-muted-foreground">
          Average success rate
        </p>
      </CardContent>
    </Card>
  );
}