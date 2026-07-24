import { Howl } from "howler";

// Optional sound effects for Kahoot-mode feedback. No audio assets ship
// with the repo -- drop mp3s at these paths under `public/sounds/` to
// enable them (e.g. from a royalty-free SFX pack). Howler's `onloaderror`
// permanently disables that particular sound instead of throwing, so a
// missing file just means silence, never a broken quiz.
const SOUND_SRC = {
  correct: "/sounds/correct.mp3",
  incorrect: "/sounds/incorrect.mp3",
  tick: "/sounds/tick.mp3",
} as const;

type SoundName = keyof typeof SOUND_SRC;

const cache = new Map<SoundName, Howl | null>();

function getHowl(name: SoundName): Howl | null {
  if (cache.has(name)) return cache.get(name) ?? null;

  const howl = new Howl({
    src: [SOUND_SRC[name]],
    volume: 0.5,
    onloaderror: () => {
      cache.set(name, null);
    },
  });

  cache.set(name, howl);
  return howl;
}

export function playQuizSound(name: SoundName) {
  if (typeof window === "undefined") return;

  try {
    getHowl(name)?.play();
  } catch {
    // Best-effort: audio playback can fail for reasons outside our control
    // (autoplay policy, decode errors) -- never let a sound glitch break
    // the quiz flow.
  }
}
