"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

type Point = { x: number; y: number };

type NeuronBurstProps = {
  // Viewport-space centre of the clicked answer button (see handleSelect
  // in MCQ.tsx). Null means there is nothing to animate.
  origin: Point | null;
  // The Neurons badge the particles fly toward. Typed `| null` because a
  // React 19 `useRef<HTMLDivElement>(null)` is `RefObject<T | null>`.
  targetRef: React.RefObject<HTMLElement | null>;
  particleCount?: number;
  onComplete?: () => void;
};

const PARTICLE_PX = 20;
const DURATION_S = 0.7;
const STAGGER_S = 0.06;

export default function NeuronBurst({
  origin,
  targetRef,
  particleCount = 4,
  onComplete,
}: NeuronBurstProps) {
  const shouldReduceMotion = useReducedMotion();

  const [target, setTarget] = React.useState<Point | null>(null);

  // Per-particle random spread + arc height, stable for this instance so a
  // re-render doesn't re-roll the trajectory mid-flight.
  const [particles] = React.useState(() =>
    Array.from({ length: particleCount }, () => ({
      spreadX: (Math.random() - 0.5) * 44,
      spreadY: (Math.random() - 0.5) * 28,
      arcLift: 40 + Math.random() * 40,
    }))
  );

  const doneCount = React.useRef(0);
  const finished = React.useRef(false);
  const finish = React.useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onComplete?.();
  }, [onComplete]);

  // Resolve the badge centre once, on mount. MCQ.tsx keys this component by
  // burst id, so every burst is a fresh instance and this runs each time.
  // A missing badge (or motion the viewer opted out of) resolves the burst
  // straight away so MCQ.tsx clears its state.
  React.useLayoutEffect(() => {
    if (!origin || shouldReduceMotion) {
      finish();
      return;
    }
    const rect = targetRef.current?.getBoundingClientRect();
    if (rect) {
      setTarget({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      finish();
    }
  }, [origin, shouldReduceMotion, targetRef, finish]);

  if (!origin || !target || shouldReduceMotion) return null;

  const half = PARTICLE_PX / 2;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {particles.map((p, i) => {
        const startX = origin.x + p.spreadX - half;
        const startY = origin.y + p.spreadY - half;
        const endX = target.x - half;
        const endY = target.y - half;
        const apexY = Math.min(startY, endY) - p.arcLift;

        return (
          <motion.img
            key={i}
            src="/icono-neurona/neurona-hex-64.png"
            alt=""
            className="absolute left-0 top-0 h-5 w-5 select-none"
            initial={{ x: startX, y: startY, opacity: 0, scale: 0.4 }}
            animate={{
              x: [startX, (startX + endX) / 2, endX],
              y: [startY, apexY, endY],
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1, 0.5],
            }}
            transition={{
              duration: DURATION_S,
              delay: i * STAGGER_S,
              ease: "easeInOut",
            }}
            onAnimationComplete={() => {
              doneCount.current += 1;
              if (doneCount.current >= particles.length) finish();
            }}
          />
        );
      })}
    </div>,
    document.body
  );
}
