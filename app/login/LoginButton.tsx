"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="rounded-xl bg-black px-6 py-3 text-white"
    >
      Continuar con Google
    </button>
  );
}