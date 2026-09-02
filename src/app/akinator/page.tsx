"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import InsufficientNeuronsCta from "@/components/games/InsufficientNeuronsCta";

export default function AkinatorPage() {
  const t = useTranslations("AkinatorPage");
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [canPlay, setCanPlay] = useState(true);
  const [missingNeurons, setMissingNeurons] = useState(0);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) {
      if (status !== "loading") setCheckingEligibility(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/akinator/eligibility");
        if (!res.ok) throw new Error("Failed to check eligibility");
        const data = (await res.json()) as { isPro: boolean; neuronsBalance: number; cost: number };
        if (!cancelled) {
          setCanPlay(data.isPro || data.neuronsBalance >= data.cost);
          setMissingNeurons(Math.max(0, data.cost - data.neuronsBalance));
        }
      } catch (error) {
        console.error("Eligibility check error:", error);
        if (!cancelled) setCanPlay(true); // fail open — the POST still enforces the debit
      } finally {
        if (!cancelled) setCheckingEligibility(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, status]);

  const handleStartGame = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/akinator", { method: "POST" });

      if (res.status === 402) {
        toast({
          title: t("insufficientNeurons"),
          description: t("buyNeuronsToPlay"),
          variant: "destructive",
        });
        return;
      }

      if (!res.ok) throw new Error("Failed to start game");

      const data = (await res.json()) as { gameId: string };
      router.push(`/akinator/${data.gameId}`);
    } catch (error) {
      console.error(error);
      toast({
        title: t("error"),
        description: t("failedToStart"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const ctaDisabled = loading || checkingEligibility || !canPlay;

  return (
    <div
      style={{
        minHeight: "100vh",
        // Theme-reactive: --background / --muted are redefined under html.dark
        background: "linear-gradient(160deg, var(--muted) 0%, var(--background) 55%)",
        color: "var(--foreground)",
        padding: "2rem 1rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ maxWidth: "720px", width: "100%", textAlign: "center" }}>
        {/* Title con gradient */}
        <div style={{ marginBottom: "2rem", paddingTop: "2rem" }}>
          <h1
            style={{
              fontSize: "clamp(44px, 12vw, 64px)",
              fontWeight: 700,
              margin: 0,
              background: "linear-gradient(135deg, #ffd700 0%, #ffb300 50%, #ff8c00 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              // dark outline keeps the gold legible on the light-mode surface
              WebkitTextStroke: "1px rgba(80, 50, 0, 0.28)",
              filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.28))",
              fontFamily: "Georgia, 'Times New Roman', serif",
              letterSpacing: "2px",
            }}
          >
            AKINATOR
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "var(--muted-foreground)",
              margin: "1rem 0 0",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {t("subtitle")}
          </p>
        </div>

        {/* How it works */}
        <div
          style={{
            background: "var(--muted)",
            border: "1px solid color-mix(in srgb, var(--muted-foreground) 22%, transparent)",
            borderRadius: "16px",
            padding: "2rem",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              color: "var(--muted-foreground)",
              margin: "0 0 1.5rem",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {t("howItWorks")}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {[
              { emoji: "❓", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", title: t("step1"), desc: t("step1desc") },
              { emoji: "🧠", gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", title: t("step2"), desc: t("step2desc") },
              { emoji: "👑", gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", title: t("step3"), desc: t("step3desc") },
            ].map((step) => (
              <div key={step.title} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "clamp(40px, 12vw, 56px)",
                    height: "clamp(40px, 12vw, 56px)",
                    background: step.gradient,
                    borderRadius: "50%",
                    margin: "0 auto 1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: "clamp(18px, 6vw, 28px)" }}>{step.emoji}</span>
                </div>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", margin: "0 0 0.5rem" }}>
                  {step.title}
                </p>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginBottom: "2rem" }}>
          <button
            type="button"
            onClick={handleStartGame}
            disabled={ctaDisabled}
            style={{
              width: "100%",
              padding: "1.25rem",
              fontSize: "18px",
              fontWeight: 600,
              background: ctaDisabled
                ? "linear-gradient(135deg, #ccaa00 0%, #998800 100%)"
                : "linear-gradient(135deg, #ffd700 0%, #ffb300 100%)",
              color: "#1a1a2e",
              border: "none",
              borderRadius: "12px",
              cursor: ctaDisabled ? "not-allowed" : "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: "0 8px 24px rgba(255, 215, 0, 0.3)",
              letterSpacing: "1px",
              textTransform: "uppercase",
              opacity: ctaDisabled ? 0.8 : 1,
            }}
            onMouseOver={(e) => {
              if (ctaDisabled) return;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(255, 215, 0, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(255, 215, 0, 0.3)";
            }}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" style={{ display: "inline" }} />
                {t("starting")}
              </>
            ) : (
              t("startGame")
            )}
          </button>
          {!checkingEligibility && !canPlay && (
            <div style={{ marginTop: "1rem" }}>
              <InsufficientNeuronsCta missing={missingNeurons} />
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push("/")}
            style={{
              background: "none",
              border: "none",
              fontSize: "13px",
              color: "var(--muted-foreground)",
              margin: "1rem auto 0",
              cursor: "pointer",
            }}
          >
            {t("backHome")}
          </button>
        </div>
      </div>
    </div>
  );
}
