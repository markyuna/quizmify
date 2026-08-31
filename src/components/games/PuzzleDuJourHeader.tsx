import { useTranslations } from "next-intl";

/**
 * Header for the Puzzle du Jour creation screen: the word "Puzzle" with each
 * letter in a Quizmify brand colour, next to a bouncing jigsaw-piece SVG,
 * over the same glass panel the rest of the app uses. Presentational only
 * (no "use client", no state) so it renders in both Server and Client trees.
 */

// One colour per letter of t("headerTitle") ("Puzzle" = 6). Wraps if a
// locale ever makes the word longer.
const LETTER_COLORS = ["#8b5cf6", "#06b6d4", "#ff6b6b", "#ec4899", "#10b981", "#f59e0b"];

function PuzzlePieceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden="true"
      className="animate-puzzle-bounce h-8 w-8 shrink-0 drop-shadow-sm sm:h-9 sm:w-9"
    >
      <defs>
        <linearGradient id="pdj-header-piece" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="0.5" stopColor="#06b6d4" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path
        fill="url(#pdj-header-piece)"
        d="M11.25 5.337c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.036 1.007-1.875 2.25-1.875S15 2.34 15 3.375c0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959 0 .332.278.598.61.578 1.91-.114 3.79-.342 5.632-.676a.75.75 0 0 1 .878.645 49.17 49.17 0 0 1 .376 5.452.657.657 0 0 1-.66.664c-.354 0-.675-.186-.958-.401a1.647 1.647 0 0 0-1.003-.349c-1.035 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401.31 0 .557.262.534.571a48.774 48.774 0 0 1-.595 4.845.75.75 0 0 1-.61.61c-1.61.29-3.244.472-4.899.535a.657.657 0 0 1-.686-.664c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.035-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959a.656.656 0 0 1-.663.686 48.99 48.99 0 0 1-4.899-.535.75.75 0 0 1-.61-.61 48.774 48.774 0 0 1-.595-4.845.657.657 0 0 1 .534-.571c.355 0 .676.186.959.401.29.221.634.349 1.003.349 1.036 0 1.875-1.007 1.875-2.25s-.84-2.25-1.875-2.25c-.369 0-.713.128-1.003.349-.283.215-.604.401-.959.401a.657.657 0 0 1-.66-.664 49.17 49.17 0 0 1 .376-5.452.75.75 0 0 1 .878-.645c1.841.334 3.721.562 5.632.676.332.02.61-.246.61-.578Z"
      />
    </svg>
  );
}

export default function PuzzleDuJourHeader() {
  const t = useTranslations("PuzzleDuJour");
  const title = t("headerTitle");

  return (
    <header className="rounded-2xl border border-slate-200/80 bg-white/70 p-5 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6">
      <div className="flex items-center justify-center gap-2.5">
        <PuzzlePieceIcon />
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          <span className="sr-only">{title}</span>
          {[...title].map((char, index) => (
            <span
              key={`${char}-${index}`}
              aria-hidden="true"
              style={{ color: LETTER_COLORS[index % LETTER_COLORS.length] }}
            >
              {char}
            </span>
          ))}
        </h1>
      </div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{t("description")}</p>
    </header>
  );
}
