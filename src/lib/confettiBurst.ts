import confetti from "canvas-confetti";

// Shared with useReducedMotion() checks in components -- confetti is a
// pure motion effect, so prefers-reduced-motion disables it entirely
// rather than trying to offer a "reduced" version.
function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** Small celebratory burst for a single correct answer. */
export function confettiCorrectAnswer() {
  if (prefersReducedMotion()) return;

  void confetti({
    particleCount: 40,
    spread: 60,
    startVelocity: 35,
    origin: { y: 0.7 },
    ticks: 150,
  });
}

/** Bigger multi-burst celebration for the final results screen. */
export function confettiQuizComplete() {
  if (prefersReducedMotion()) return;

  const colors = ["#8b5cf6", "#d946ef", "#06b6d4", "#f59e0b"];

  void confetti({ particleCount: 120, spread: 100, origin: { y: 0.6 }, colors });
  window.setTimeout(() => {
    void confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
    void confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
  }, 250);
}
