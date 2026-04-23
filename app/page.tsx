"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SnapshotMes, DatoCCAA } from "@/lib/types";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(0)}K`
    : n.toFixed(1);

const fmtEur = (n: number) => `${n.toFixed(1)}€`;
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

function Trend({ v }: { v: number }) {
  if (v > 0) return <span style={{ color: "var(--green)", display: "flex", alignItems: "center", gap: 3 }}><TrendingUp size={13} />{fmtPct(v)}</span>;
  if (v < 0) return <span style={{ color: "var(--red)", display: "flex", alignItems: "center", gap: 3 }}><TrendingDown size={13} />{fmtPct(v)}</span>;
  return <span style={{ color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: 3 }}><Minus size={13} />0%</span>;
}

const KPI_FIELDS = [
  { key: "total_pernoctaciones", label: "Pernoctaciones", format: (v: number) => fmt(v), sub: "total periodo" },
  { key: "variacion_anual",      label: "Variación anual", format: fmtPct,  sub: "vs mismo mes 2024" },
  { key: "revpar",               label: "RevPAR",          format: fmtEur, sub: "ingresos/hab. disponible" },
  { key: "adr",                  label: "ADR",             format: fmtEur, sub: "tarifa media diaria" },
  { key: "ocupacion",            label: "Ocupación",       format: (v: number) => `${v.toFixed(1)}%`, sub: "por habitaciones" },
  { key: "iph",                  label: "IPH",             format: fmtPct, sub: "inflación hotelera" },
] as const;

const CCAA_COLOR = "#c8420a";
const LINE_COLOR = "#1a4d8f";
const LINE_COLOR2 = "#c8420a";

export default function Dashboard() {
  const [data, setData] = useState<SnapshotMes | null>(null);
  const [metrica, setMetrica] = useState<"pernoctaciones" | "viajeros">("pernoctaciones");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/datos")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <p style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)", fontSize: 13, letterSpacing: "0.1em" }}>
        CARGANDO DATOS —
      </p>
    </div>
  );

  if (!data) return (
    <div style={{ padding: "4rem", fontFamily: "var(--font-mono)", color: "var(--red)" }}>
      Error cargando datos. Revisa la consola.
    </div>
  );

  const topCCAA = [...data.por_ccaa].sort((a, b) => b[metrica === "pernoctaciones" ? "pernoctaciones" : "viajeros"] - a[metrica === "pernoctaciones" ? "pernoctaciones" : "viajeros"]);
  const maxVal = topCCAA[0]?.[metrica === "pernoctaciones" ? "pernoctaciones" : "viajeros"] ?? 1;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem 4rem" }}>

      {/* HEADER */}
      <header style={{ borderBottom: "1px solid var(--border)", padding: "2rem 0 1.25rem", marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", color: "var(--ink-muted)", textTransform: "uppercase", marginBottom: 8 }}>
              Barómetro · Sector Hotelero España
            </p>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 400, lineHeight: 1.05, color: "var(--ink)" }}>
              {data.periodo}
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>
              FUENTE: INE — EOH / IPH / IRSH
            </p>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>
              ACT. {data.actualizado}
            </p>
          </div>
        </div>
      </header>

      {/* KPI GRID */}
      <section style={{ marginBottom: "3rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1px",
          background: "var(--border)",
          border: "1px solid var(--border)",
        }}>
          {KPI_FIELDS.map(({ key, label, format, sub }) => {
            const val = data.kpis[key as keyof typeof data.kpis] as number;
            return (
              <div key={key} style={{ background: "var(--paper)", padding: "1.25rem 1rem" }}>
                <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-faint)", textTransform: "uppercase", marginBottom: 8 }}>
                  {label}
                </p>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.4rem, 3vw, 2rem)", color: "var(--ink)", marginBottom: 4 }}>
                  {format(val)}
                </p>
                <p style={{ fontSize: 11, color: "var(--ink-muted)" }}>{sub}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* GRÁFICOS: 2 columnas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "3rem" }}>

        {/* Estacionalidad mensual */}
        <section style={{ background: "var(--paper)", border: "1px solid var(--border)", padding: "1.5rem" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-faint)", textTransform: "uppercase", marginBottom: 4 }}>
              Evolución mensual
            </p>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 400 }}>
              Pernoctaciones 2024–2025
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.mensual} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-3)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--ink-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--ink-muted)" }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                formatter={(v: number) => [fmt(v), "Pernoctaciones"]}
                contentStyle={{ fontFamily: "var(--font-mono)", fontSize: 12, border: "1px solid var(--border)", background: "var(--paper)", borderRadius: 0 }}
              />
              <Line type="monotone" dataKey="pernoctaciones" stroke={LINE_COLOR} strokeWidth={2} dot={{ r: 3, fill: LINE_COLOR }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* Ranking CCAA */}
        <section style={{ background: "var(--paper)", border: "1px solid var(--border)", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: 8 }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-faint)", textTransform: "uppercase", marginBottom: 4 }}>
                Ranking CCAA
              </p>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 400 }}>
                Por {metrica}
              </h2>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["pernoctaciones", "viajeros"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetrica(m)}
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em",
                    padding: "4px 10px", border: "1px solid var(--border)",
                    background: metrica === m ? "var(--ink)" : "transparent",
                    color: metrica === m ? "var(--paper)" : "var(--ink-muted)",
                    cursor: "pointer", textTransform: "uppercase",
                  }}
                >
                  {m}
                </button>
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
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: i === 0 ? "var(--ink)" : "var(--ink-muted)" }}>
                      {String(i + 1).padStart(2, "0")} {d.ccaa}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>
                      {fmt(val)}
                    </span>
                  </div>
                  <div style={{ height: 3, background: "var(--paper-3)" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: i === 0 ? "var(--accent)" : "var(--ink-faint)", transition: "width 0.4s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* TABLA CCAA COMPLETA */}
      <section style={{ border: "1px solid var(--border)", marginBottom: "3rem" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ink-faint)", textTransform: "uppercase", marginBottom: 4 }}>
            Detalle por comunidad autónoma
          </p>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 400 }}>
            Indicadores 2024
          </h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--paper-2)" }}>
                {["CCAA", "Pernoctaciones", "Viajeros", "Var. anual", "Ocupación"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", color: "var(--ink-muted)", fontWeight: 500, textTransform: "uppercase", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCCAA.map((d: DatoCCAA, i) => (
                <tr key={d.ccaa} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--paper)" : "var(--paper-2)" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--ink)" }}>{d.ccaa}</td>
                  <td style={{ padding: "10px 16px", color: "var(--ink)" }}>{fmt(d.pernoctaciones)}</td>
                  <td style={{ padding: "10px 16px", color: "var(--ink-muted)" }}>{fmt(d.viajeros)}</td>
                  <td style={{ padding: "10px 16px" }}><Trend v={d.variacion_anual} /></td>
                  <td style={{ padding: "10px 16px", color: "var(--ink)" }}>{d.ocupacion.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <p style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
          © {new Date().getFullYear()} Barómetro Hotelero España · Datos: INE (EOH, IPH, IRSH) · Uso libre con atribución
        </p>
        <p style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
          Actualización mensual automática
        </p>
      </footer>
    </div>
  );
}
