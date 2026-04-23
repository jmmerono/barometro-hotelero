import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

const DEMO_DATA = {
  periodo: "Enero 2025",
  actualizado: "2025-02-24",
  kpis: {
    total_pernoctaciones: 18200000,
    variacion_anual: 3.4,
    revpar: 116.0,
    adr: 152.3,
    ocupacion: 66.2,
    iph: 4.3,
    periodo: "Enero 2025",
  },
  por_ccaa: [
    { ccaa: "Cataluña",        pernoctaciones: 62300000, viajeros: 28100000, variacion_anual: 5.2, ocupacion: 71.2 },
    { ccaa: "Canarias",        pernoctaciones: 59800000, viajeros: 22400000, variacion_anual: 3.1, ocupacion: 78.4 },
    { ccaa: "Andalucía",       pernoctaciones: 57400000, viajeros: 26800000, variacion_anual: 6.8, ocupacion: 64.3 },
    { ccaa: "C. Valenciana",   pernoctaciones: 34200000, viajeros: 16200000, variacion_anual: 4.4, ocupacion: 61.8 },
    { ccaa: "Baleares",        pernoctaciones: 33100000, viajeros: 14700000, variacion_anual: 2.9, ocupacion: 74.1 },
    { ccaa: "Madrid",          pernoctaciones: 29600000, viajeros: 16400000, variacion_anual: 7.1, ocupacion: 68.9 },
    { ccaa: "País Vasco",      pernoctaciones:  8700000, viajeros:  4200000, variacion_anual: 6.3, ocupacion: 62.4 },
    { ccaa: "Galicia",         pernoctaciones:  7900000, viajeros:  3800000, variacion_anual: 5.9, ocupacion: 55.3 },
    { ccaa: "Castilla y León", pernoctaciones:  6400000, viajeros:  3100000, variacion_anual: 3.2, ocupacion: 48.7 },
    { ccaa: "Aragón",          pernoctaciones:  5100000, viajeros:  2400000, variacion_anual: 4.7, ocupacion: 52.1 },
  ],
  mensual: [
    { mes: "2024-01", label: "Ene", pernoctaciones: 17100000, viajeros: 7800000 },
    { mes: "2024-02", label: "Feb", pernoctaciones: 18600000, viajeros: 8400000 },
    { mes: "2024-03", label: "Mar", pernoctaciones: 26900000, viajeros: 12100000 },
    { mes: "2024-04", label: "Abr", pernoctaciones: 30400000, viajeros: 14200000 },
    { mes: "2024-05", label: "May", pernoctaciones: 33800000, viajeros: 15600000 },
    { mes: "2024-06", label: "Jun", pernoctaciones: 40100000, viajeros: 18900000 },
    { mes: "2024-07", label: "Jul", pernoctaciones: 43100000, viajeros: 20100000 },
    { mes: "2024-08", label: "Ago", pernoctaciones: 42800000, viajeros: 19800000 },
    { mes: "2024-09", label: "Sep", pernoctaciones: 38700000, viajeros: 17900000 },
    { mes: "2024-10", label: "Oct", pernoctaciones: 33900000, viajeros: 15700000 },
    { mes: "2024-11", label: "Nov", pernoctaciones: 21200000, viajeros:  9800000 },
    { mes: "2024-12", label: "Dic", pernoctaciones: 18800000, viajeros:  8700000 },
    { mes: "2025-01", label: "Ene", pernoctaciones: 18200000, viajeros:  8300000 },
  ],
};

export async function GET() {
  try {
    const q = query(collection(db, "eoh"), orderBy("periodo", "desc"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return NextResponse.json(snap.docs[0].data());
    }
    return NextResponse.json(DEMO_DATA);
  } catch (error) {
    console.error("Firebase error:", error);
    return NextResponse.json(DEMO_DATA);
  }
}
