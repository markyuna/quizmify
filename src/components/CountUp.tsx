"use client";

import * as React from "react";
import { useInView, useReducedMotion, animate } from "framer-motion";

type CountUpProps = {
  value: number;
  prefix?: string;
  duration?: number;
  className?: string;
};

/**
 * Animates from 0 to `value` once the element scrolls into view. Renders
 * the final value immediately (no animation) if the OS has
 * prefers-reduced-motion enabled.
 */
export default function CountUp({ value, prefix = "", duration = 1.2, className }: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const shouldReduceMotion = useReducedMotion();
  const [display, setDisplay] = React.useState(shouldReduceMotion ? value : 0);

  React.useEffect(() => {
    if (!isInView) return;

    if (shouldReduceMotion) {
      setDisplay(value);
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    return () => controls.stop();
  }, [isInView, shouldReduceMotion, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
    </span>
  );
}
