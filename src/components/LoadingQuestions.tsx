"use client";

import * as React from "react";
import Image from "next/image";
import { Progress } from "./ui/progress";

type LoadingQuestionsProps = {
  finished: boolean;
};

const loadingTexts = [
  "Generating questions...",
  "Unleashing the power of curiosity...",
  "Diving deep into the ocean of questions...",
  "Harnessing the collective knowledge of the cosmos...",
  "Igniting the flame of wonder and exploration...",
];

export default function LoadingQuestions({
  finished,
}: LoadingQuestionsProps) {
  const [progress, setProgress] = React.useState(0);
  const [loadingText, setLoadingText] = React.useState(loadingTexts[0]);

  React.useEffect(() => {
    if (finished) {
      setProgress(100);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + (Math.random() < 0.1 ? 2 : 0.5), 95));
    }, 100);

    return () => clearInterval(interval);
  }, [finished]);

  React.useEffect(() => {
    if (finished) return;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * loadingTexts.length);
      setLoadingText(loadingTexts[randomIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, [finished]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col items-center justify-center px-4 py-10">
      <Image
        src="/loading.gif"
        width={300}
        height={300}
        alt="Loading animation"
        priority
      />
      <Progress value={progress} className="mt-4 w-full" />
      <h1 className="mt-4 text-center text-xl font-medium">{loadingText}</h1>
    </main>
  );
}