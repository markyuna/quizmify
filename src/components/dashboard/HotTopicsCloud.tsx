"use client";

import { useRouter } from "next/navigation";
import { Hash, TrendingUp } from "lucide-react";

type TopicItem = {
  text: string;
  value: number;
};

type HotTopicsCloudProps = {
  formattedTopics: TopicItem[];
};

export default function HotTopicsCloud({
  formattedTopics,
}: HotTopicsCloudProps) {
  const router = useRouter();

  const maxValue = Math.max(...formattedTopics.map((topic) => topic.value), 1);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {formattedTopics.map((topic) => {
          const intensity = topic.value / maxValue;

          const sizeClass =
            intensity > 0.8
              ? "text-base font-bold"
              : intensity > 0.55
                ? "text-sm font-semibold"
                : "text-sm font-medium";

          return (
            <button
              key={topic.text}
              type="button"
              onClick={() =>
                router.push(`/quiz?topic=${encodeURIComponent(topic.text)}`)
              }
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/60 px-4 py-3 text-left shadow-sm backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] hover:border-violet-300/30 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-500/15">
                  <Hash className="h-4 w-4 text-violet-400" />
                </div>

                <div className="min-w-0">
                  <p className={`truncate ${sizeClass}`}>{topic.text}</p>
                  <p className="text-xs text-muted-foreground">
                    Popular quiz topic
                  </p>
                </div>
              </div>

              <div className="ml-3 flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground dark:bg-white/5">
                <TrendingUp className="h-3.5 w-3.5 text-fuchsia-400" />
                {topic.value}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}