"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PremiumContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div style={{ maxWidth: 600, margin: "8rem auto", padding: "0 1.5rem", fontFamily: "var(--font-mono)", textAlign: "center" }}>
      <p style={{ fontSize: 11, letterSpacing: "0.15em", color: "#b0b0b0", textTransform: "uppercase", marginBottom: 16 }}>
        Barómetro Hotelero España
      </p>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.5rem", fontWeight: 400, marginBottom: 16 }}>
        ¡Bienvenido a Premium!
      </h1>
      <p style={{ color: "#6b6b6b", marginBottom: 32, lineHeight: 1.7 }}>
        Tu suscripción está activa. Ya tienes acceso al histórico completo de 24 meses.
      </p>
      <a href="/" style={{
        fontFamily: "monospace", fontSize: 12, letterSpacing: "0.1em",
        padding: "12px 24px", background: "#0d0d0d", color: "#f9f7f2",
        textDecoration: "none", textTransform: "uppercase",
      }}>
        Ir al dashboard →
      </a>
    </div>
  );
}

export default function PremiumPage() {
  return <Suspense><PremiumContent /></Suspense>;
}
