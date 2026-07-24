"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LevelUpPaywallModal from "./LevelUpPaywallModal";
import { isPaywallTrigger, calculateLevel } from "@/lib/xpProgression";
import { trackAttemptedLevel3, trackEvent } from "@/lib/analytics";

type LevelUpPaywallWrapperProps = {
  userXp: number;
  isPro: boolean;
};

/**
 * Wraps the paywall modal logic. Monitors user XP and shows the
 * upgrade modal when a Free user tries to reach level 3.
 * Should be mounted once in the dashboard or main layout for authenticated users.
 */
export default function LevelUpPaywallWrapper({
  userXp,
  isPro,
}: LevelUpPaywallWrapperProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (isPro || hasShownRef.current) return;

    const currentLevel = calculateLevel(userXp);
    const nextLevel = currentLevel + 1;

    if (isPaywallTrigger(nextLevel, isPro)) {
      hasShownRef.current = true;
      trackAttemptedLevel3();
      // Use queueMicrotask to defer setState, avoiding sync setState in effect
      queueMicrotask(() => {
        setShowModal(true);
      });
    }
  }, [userXp, isPro]);

  const handleClose = () => {
    trackEvent("paywall_dismissed", {
      method: "close_button",
      userLevel: calculateLevel(userXp),
    });
    setShowModal(false);
  };

  const handleUpgrade = () => {
    trackEvent("upgrade_initiated", {
      source: "level_3_paywall_modal",
    });
    router.push("/upgrade");
  };

  if (isPro) return null;

  return (
    <LevelUpPaywallModal
      open={showModal}
      onClose={handleClose}
      onUpgrade={handleUpgrade}
    />
  );
}
