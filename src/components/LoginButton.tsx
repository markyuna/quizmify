"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LoginButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await signIn("google", { callbackUrl: "/dashboard" });
      }}
    >
      {loading ? "Conectando..." : "Continuar con Google"}
    </Button>
  );
}