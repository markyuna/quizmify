"use client";

import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import IdleTimeoutWarningModal from "./IdleTimeoutWarningModal";

export default function IdleTimeoutProvider() {
  const { authenticated, showWarning, secondsRemaining, extendSession } = useIdleTimeout();

  if (!authenticated) return null;

  return (
    <IdleTimeoutWarningModal
      open={showWarning}
      secondsRemaining={secondsRemaining}
      onExtend={extendSession}
    />
  );
}
