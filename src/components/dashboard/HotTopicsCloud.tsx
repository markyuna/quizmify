"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

type TopicItem = {
  text: string;
  value: number;
};

type HotTopicsCloudProps = {
  formattedTopics: TopicItem[];
};

const lightPalette = [
  "text-violet-600",
  "text-fuchsia-600",
  "text-cyan-600",
  "text-sky-600",
  "text-indigo-600",
  "text-teal-600",
];

const darkPalette = [
  "text-violet-300",
  "text-fuchsia-300",
  "text-cyan-300",
  "text-sky-300",
  "text-indigo-300",
  "text-teal-300",
];

function getColorClass(text: string, theme?: string) {
  const palette = theme === "dark" ? darkPalette : lightPalette;

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  return palette[Math.abs(hash) % palette.length];
}

function getSizeClass(value: number, maxValue: number) {
  const ratio = value / maxValue;

  if (ratio >= 0.9) return "text-3xl md:text-4xl font-extrabold";
  if (ratio >= 0.75) return "text-2xl md:text-3xl font-bold";
  if (ratio >= 0.55) return "text-xl md:text-2xl font-semibold";
  if (ratio >= 0.35) return "text-lg md:text-xl font-semibold";
  return "text-base md:text-lg font-medium";
}

function generateCloudPositions(count: number) {
  const presets = [
    { top: "14%", left: "18%", rotate: -8, duration: 5.8, delay: 0.1 },
    { top: "18%", left: "48%", rotate: 5, duration: 6.6, delay: 0.3 },
    { top: "16%", left: "78%", rotate: -4, duration: 5.2, delay: 0.5 },
    { top: "34%", left: "28%", rotate: 7, duration: 6.2, delay: 0.2 },
    { top: "36%", left: "62%", rotate: -6, duration: 5.6, delay: 0.7 },
    { top: "52%", left: "14%", rotate: 4, duration: 6.8, delay: 0.4 },
    { top: "50%", left: "46%", rotate: -7, duration: 5.4, delay: 0.6 },
    { top: "54%", left: "78%", rotate: 6, duration: 6.1, delay: 0.8 },
    { top: "74%", left: "24%", rotate: -5, duration: 5.9, delay: 0.9 },
    { top: "72%", left: "56%", rotate: 4, duration: 6.4, delay: 1.1 },
    { top: "78%", left: "82%", rotate: -6, duration: 5.7, delay: 1.3 },
    { top: "28%", left: "84%", rotate: 3, duration: 6.0, delay: 1.0 },
  ];

  return Array.from({ length: count }, (_, i) => presets[i % presets.length]);
}

export default function HotTopicsCloud({
  formattedTopics,
}: HotTopicsCloudProps) {
  const router = useRouter();
  const { theme } = useTheme();

  const maxValue = Math.max(...formattedTopics.map((topic) => topic.value), 1);

  const topics = useMemo(() => {
    const sorted = [...formattedTopics].sort((a, b) => b.value - a.value);
    const positions = generateCloudPositions(sorted.length);

    return sorted.map((topic, index) => ({
      ...topic,
      ...positions[index],
      colorClass: getColorClass(topic.text, theme),
      sizeClass: getSizeClass(topic.value, maxValue),
    }));
  }, [formattedTopics, maxValue, theme]);

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-[1.25rem]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_50%_80%,rgba(217,70,239,0.10),transparent_30%)]" />

      <div className="pointer-events-none absolute left-[12%] top-[18%] h-20 w-20 rounded-full bg-violet-500/10 blur-2xl" />
      <div className="pointer-events-none absolute right-[10%] top-[20%] h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
      <div className="pointer-events-none absolute bottom-[12%] left-[40%] h-24 w-24 rounded-full bg-fuchsia-500/10 blur-2xl" />

      {topics.map((topic, index) => (
        <motion.button
          key={topic.text}
          type="button"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -6, 0, 5, 0],
          }}
          transition={{
            opacity: { duration: 0.35, delay: index * 0.04 },
            scale: { duration: 0.35, delay: index * 0.04 },
            y: {
              duration: topic.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: topic.delay,
            },
          }}
          whileHover={{
            scale: 1.1,
            y: -4,
          }}
          whileTap={{ scale: 0.96 }}
          onClick={() =>
            router.push(`/quiz?topic=${encodeURIComponent(topic.text)}`)
          }
          className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1.5 transition-all duration-300 ${topic.colorClass} ${topic.sizeClass} hover:bg-white/50 hover:shadow-[0_0_35px_rgba(168,85,247,0.18)] dark:hover:bg-white/10`}
          style={{
            top: topic.top,
            left: topic.left,
            transform: `translate(-50%, -50%) rotate(${topic.rotate}deg)`,
          }}
        >
          <span className="relative z-10 drop-shadow-sm">{topic.text}</span>
        </motion.button>
      ))}
    </div>
  );
}