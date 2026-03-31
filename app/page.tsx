"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function HomePage() {
  const { data: session, status } = useSession();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
        background: "#f7f7f8",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginBottom: "16px" }}>Google Auth Test</h1>

        {status === "loading" && <p>Cargando sesión...</p>}

        {status === "authenticated" && session?.user && (
          <div>
            <p>
              <strong>Conectado como:</strong>
            </p>
            <p>{session.user.name}</p>
            <p>{session.user.email}</p>

            {session.user.image ? (
              <img
                src={session.user.image}
                alt="Avatar"
                width={80}
                height={80}
                style={{
                  borderRadius: "999px",
                  marginTop: "12px",
                  objectFit: "cover",
                }}
              />
            ) : null}

            <button
              onClick={() => signOut()}
              style={{
                marginTop: "20px",
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: "black",
                color: "white",
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {status === "unauthenticated" && (
          <div>
            <p style={{ marginBottom: "16px" }}>
              No has iniciado sesión todavía.
            </p>

            <button
              onClick={() => signIn("google")}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: "#4285F4",
                color: "white",
                cursor: "pointer",
              }}
            >
              Continuar con Google
            </button>
          </div>
        )}
      </div>
    </main>
  );
}