"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

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

function getFontSize(value: number) {
  return Math.max(16, Math.min(42, Math.log2(value + 1) * 8 + 10));
}

export default function CustomWordCloud({ formattedTopics }: Props) {
  const { theme } = useTheme();
  const router = useRouter();

  const data = useMemo(
    () =>
      [...formattedTopics]
        .sort((a, b) => b.value - a.value)
        .map((word) => ({
          ...word,
          color: getColorFromText(word.text, theme),
          fontSize: getFontSize(word.value),
        })),
    [formattedTopics, theme]
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl p-4">
      {data.map((word) => (
        <button
          key={word.text}
          type="button"
          onClick={() =>
            router.push(`/quiz?topic=${encodeURIComponent(word.text)}`)
          }
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-semibold transition-transform duration-200 hover:scale-105 hover:bg-white/10"
          style={{
            color: word.color,
            fontSize: `${word.fontSize}px`,
            lineHeight: 1.1,
          }}
        >
          {word.text}
        </button>
      ))}
    </div>
  );
}