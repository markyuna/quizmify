"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import D3WordCloud from "react-d3-cloud";

type Topic = {
  text: string;
  value: number;
};

type Props = {
  formattedTopics: Topic[];
};

const lightPalette = [
  "#7c3aed",
  "#a855f7",
  "#d946ef",
  "#2563eb",
  "#0891b2",
  "#0f766e",
];

const darkPalette = [
  "#c4b5fd",
  "#d8b4fe",
  "#f0abfc",
  "#93c5fd",
  "#67e8f9",
  "#5eead4",
];

function getColorFromText(text: string, theme: string | undefined) {
  const palette = theme === "dark" ? darkPalette : lightPalette;

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  return palette[Math.abs(hash) % palette.length];
}

function getBaseFontSize(value: number) {
  return Math.max(18, Math.min(64, Math.log2(value + 1) * 12 + 10));
}

export default function CustomWordCloud({ formattedTopics }: Props) {
  const { theme } = useTheme();
  const router = useRouter();

  const data = useMemo(
    () =>
      formattedTopics.map((word) => ({
        ...word,
        color: getColorFromText(word.text, theme),
      })),
    [formattedTopics, theme]
  );

  return (
    <div className="cursor-pointer">
      <D3WordCloud
        height={550}
        data={data}
        font="Inter"
        fontSize={(word: Topic) => getBaseFontSize(word.value)}
        rotate={0}
        padding={6}
        fill={(word: Topic & { color?: string }) =>
          word.color ?? (theme === "dark" ? "#ffffff" : "#111111")
        }
        onWordClick={(word: Topic) => {
          router.push(`/quiz?topic=${encodeURIComponent(word.text)}`);
        }}
      />
    </div>
  );
}