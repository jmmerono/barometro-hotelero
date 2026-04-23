"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Lock } from "lucide-react";
import type { SnapshotMes, DatoCCAA } from "@/lib/types";

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K`
  : n.toFixed(1);

const fmtEur = (n: number) => `${n.toFixed(1)}€`;
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

function Trend({ v }: { v: number }) {
  if (v > 0) return <span style={{ color: "#1a6b3a", display: "flex", alignItems: "center", gap: 3 }}><TrendingUp size={13} />{fmtPct(v)}</span>;
  if (v < 0) return <span style={{ color: "#c8220a", display: "flex", alignItems: "center", gap: 3 }}><TrendingDown size={13} />{fmtPct(v)}</span>;
  return <span style={{ color: "#6b6b6b", display: "flex", alignItems: "center", gap: 3 }}><Minus size={13} />0%</span>;
}

const KPI_FIELDS = [
  { key: "total_pernoctaciones", label: "Pernoctaciones", format: fmt, sub: "total periodo" },
  { key: "variacion_anual",      label: "Variación anual", format: fmtPct, sub: "vs mismo mes año anterior" },
  { key: "revpar",               label: "RevPAR",          format: fmtEur, sub: "ingresos/hab. disponible" },
  { key: "adr",                  label: "ADR",             format: fmtEur, sub: "tarifa media diaria" },
  { key: "ocupacion",            label: "Ocupación",       format: (v: number) => `${v.toFixed(1)}%`, sub: "por habitaciones" },
  { key: "iph",                  label: "IPH",             format: fmtPct, sub: "inflación hotelera" },
] as const;

export default function Dashboard() {
  const [data, setData]         = useState<SnapshotMes | null>(null);
  const [metrica, setMetrica]   = useState<"pernoctaciones" | "viajeros">("pernoctaciones");
  const [loading, setLoading]   = useState(true);
  const [email, setEmail]       = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetch("/api/datos")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    const savedEmail = localStorage.getItem("bh_email");
    if (savedEmail) {
      setEmail(savedEmail);
      fetch(`/api/premium?email=${encodeURIComponent(savedEmail)}`)
        .then(r => r.json())
        .then(d => setIsPremium(d.premium));
    }
  }, []);

  const handleCheckout = async () => {
    if (!email) { alert("Introduce tu email primero"); return; }
    setCheckingOut(true);
    localStorage.setItem("bh_email", email);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p style={{ fontFamily: "monospace", color: "#6b6b6b", fontSize: 13, letterSpacing: "0.1em" }}>CARGANDO —</p>
    </div>
  );

  if (!data) return <div style={{ padding: "4rem", color: "#c8220a" }}>Error cargando datos.</div>;

  const topCCAA = [...data.por_ccaa].sort((a, b) =>
    b[metrica === "pernoctaciones" ? "pernoctaciones" : "viajeros"] -
    a[metrica === "pernoctaciones" ? "pernoctaciones" : "viajeros"]);
  const maxVal = topCCAA[0]?.[metrica === "pernoctaciones" ? "pernoctaciones" : "viajeros"] ?? 1;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem 4rem" }}>

      {/* HEADER */}
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.10)", padding: "2rem 0 1.25rem", marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.15em", color: "#b0b0b0", textTransform: "uppercase", marginBottom: 8 }}>
              Barómetro · Sector Hotelero España
            </p>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 400, lineHeight: 1.05 }}>
              {data.periodo}
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "#b0b0b0", fontFamily: "monospace", letterSpacing: "0.1em" }}>FUENTE: INE — EOH / IPH / IRSH</p>
            <p style={{ fontSize: 11, color: "#b0b0b0", fontFamily: "monospace", letterSpacing: "0.1em" }}>ACT. {data.actualizado}</p>
          </div>
        </div>
      </header>

      {/* KPI GRID */}
      <section style={{ marginBottom: "3rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1px", background: "rgba(0,0,0,0.10)", border: "1px solid rgba(0,0,0,0.10)" }}>
          {KPI_FIELDS.map(({ key, label, format, sub }) => {
            const val = data.kpis[key as keyof typeof data.kpis] as number;
            return (
              <div key={key} style={{ background: "#f9f7f2", padding: "1.25rem 1rem" }}>
                <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "#b0b0b0", textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.4rem, 3vw, 2rem)", marginBottom: 4 }}>{format(val)}</p>
                <p style={{ fontSize: 11, color: "#6b6b6b" }}>{sub}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* GRÁFICOS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "3rem" }}>
        <section style={{ background: "#f9f7f2", border: "1px solid rgba(0,0,0,0.10)", padding: "1.5rem" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "#b0b0b0", textTransform: "uppercase", marginBottom: 4 }}>Evolución mensual</p>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 400, marginBottom: "1.25rem" }}>Pernoctaciones</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.mensual} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4da" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "monospace", fill: "#6b6b6b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${(v/1e6).toFixed(0)}M`} tick={{ fontSize: 10, fontFamily: "monospace", fill: "#6b6b6b" }} axisLine={false} tickLine={false} width={36} />
              <Tooltip formatter={(v: number) => [fmt(v), "Pernoctaciones"]} contentStyle={{ fontFamily: "monospace", fontSize: 12, border: "1px solid rgba(0,0,0,0.10)", background: "#f9f7f2", borderRadius: 0 }} />
              <Line type="monotone" dataKey="pernoctaciones" stroke="#1a4d8f" strokeWidth={2} dot={{ r: 3, fill: "#1a4d8f" }} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section style={{ background: "#f9f7f2", border: "1px solid rgba(0,0,0,0.10)", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: 8 }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "#b0b0b0", textTransform: "uppercase", marginBottom: 4 }}>Ranking CCAA</p>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 400 }}>Por {metrica}</h2>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["pernoctaciones", "viajeros"] as const).map(m => (
                <button key={m} onClick={() => setMetrica(m)} style={{
                  fontFamily: "monospace", fontSize: 10, letterSpacing: "0.08em",
                  padding: "4px 10px", border: "1px solid rgba(0,0,0,0.10)",
                  background: metrica === m ? "#0d0d0d" : "transparent",
                  color: metrica === m ? "#f9f7f2" : "#6b6b6b",
                  cursor: "pointer", textTransform: "uppercase",
                }}>{m}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topCCAA.map((d: DatoCCAA, i) => {
              const val = metrica === "pernoctaciones" ? d.pernoctaciones : d.viajeros;
              const pct = (val / maxVal) * 100;
              return (
                <div key={d.ccaa}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: i === 0 ? "#0d0d0d" : "#6b6b6b" }}>{String(i+1).padStart(2,"0")} {d.ccaa}</span>
                    <span style={{ fontSize: 11, fontFamily: "monospace" }}>{fmt(val)}</span>
                  </div>
                  <div style={{ height: 3, background: "#e8e4da" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? "#c8420a" : "#b0b0b0", transition: "width 0.4s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* TABLA */}
      <section style={{ border: "1px solid rgba(0,0,0,0.10)", marginBottom: "3rem" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.10)" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "#b0b0b0", textTransform: "uppercase", marginBottom: 4 }}>Detalle por comunidad autónoma</p>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 400 }}>{data.periodo}</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f0ede6" }}>
                {["CCAA","Pernoctaciones","Viajeros","Var. anual","Ocupación"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", color: "#6b6b6b", fontWeight: 500, textTransform: "uppercase", borderBottom: "1px solid rgba(0,0,0,0.10)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCCAA.map((d: DatoCCAA, i) => (
                <tr key={d.ccaa} style={{ borderBottom: "1px solid rgba(0,0,0,0.10)", background: i % 2 === 0 ? "#f9f7f2" : "#f0ede6" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 500 }}>{d.ccaa}</td>
                  <td style={{ padding: "10px 16px" }}>{fmt(d.pernoctaciones)}</td>
                  <td style={{ padding: "10px 16px", color: "#6b6b6b" }}>{fmt(d.viajeros)}</td>
                  <td style={{ padding: "10px 16px" }}><Trend v={d.variacion_anual} /></td>
                  <td style={{ padding: "10px 16px" }}>{d.ocupacion.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MURO DE PAGO */}
      <section style={{ border: "1px solid rgba(0,0,0,0.10)", marginBottom: "3rem", overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.10)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "#b0b0b0", textTransform: "uppercase", marginBottom: 4 }}>Histórico 24 meses</p>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 400 }}>Evolución 2023–2025</h2>
          </div>
          {isPremium && <span style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.1em", color: "#1a6b3a", textTransform: "uppercase" }}>✓ Premium activo</span>}
        </div>

        {isPremium ? (
          <div style={{ padding: "1.5rem" }}>
            <p style={{ fontFamily: "monospace", fontSize: 12, color: "#6b6b6b" }}>
              Acceso completo activo. El gráfico histórico estará disponible en la próxima actualización.
            </p>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {/* Preview borroso */}
            <div style={{ filter: "blur(4px)", pointerEvents: "none", padding: "1.5rem", opacity: 0.4 }}>
              <div style={{ height: 180, background: "linear-gradient(90deg, #e8e4da 25%, #f0ede6 50%, #e8e4da 75%)", borderRadius: 4 }} />
            </div>
            {/* Overlay */}
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
              background: "rgba(249,247,242,0.85)",
            }}>
              <Lock size={24} color="#6b6b6b" />
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", marginBottom: 4 }}>
                  Histórico completo · 24 meses
                </p>
                <p style={{ fontFamily: "monospace", fontSize: 11, color: "#6b6b6b" }}>
                  RevPAR, ADR, pernoctaciones y ocupación mes a mes
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    fontFamily: "monospace", fontSize: 12, padding: "8px 12px",
                    border: "1px solid rgba(0,0,0,0.20)", background: "#f9f7f2",
                    outline: "none", width: 200,
                  }}
                />
                <button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  style={{
                    fontFamily: "monospace", fontSize: 11, letterSpacing: "0.1em",
                    padding: "9px 20px", background: "#0d0d0d", color: "#f9f7f2",
                    border: "none", cursor: "pointer", textTransform: "uppercase",
                    opacity: checkingOut ? 0.6 : 1,
                  }}
                >
                  {checkingOut ? "Redirigiendo..." : "Acceder · 9€/mes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(0,0,0,0.10)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <p style={{ fontSize: 11, color: "#b0b0b0", fontFamily: "monospace", letterSpacing: "0.08em" }}>
          © {new Date().getFullYear()} Barómetro Hotelero España · Datos: INE (EOH, IPH, IRSH)
        </p>
        <p style={{ fontSize: 11, color: "#b0b0b0", fontFamily: "monospace", letterSpacing: "0.08em" }}>
          Actualización mensual automática
        </p>
      </footer>
    </div>
  );
}
