"use client";

import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";

type TopicItem = {
  text: string;
  value: number;
};

type HotTopicsCloudProps = {
  formattedTopics: TopicItem[];
};

const CustomWordCloud = dynamic(() => import("../CustomWordCloud"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/50 shadow-sm backdrop-blur-xl dark:bg-white/5">
          <Sparkles className="h-5 w-5 text-violet-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Loading topic trends</p>
          <p className="text-sm text-muted-foreground">
            Preparing your hottest quiz topics...
          </p>
        </div>
      </div>
    </div>
  ),
});

export default function HotTopicsCloud({
  formattedTopics,
}: HotTopicsCloudProps) {
  return <CustomWordCloud formattedTopics={formattedTopics} />;
}