import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const adminDb = getAdminDb();

    // Verificar acceso premium
    const userSnap = await adminDb.collection("premium_users").doc(email).get();
    if (!userSnap.exists || !userSnap.data()?.active) {
      return NextResponse.json({ error: "Acceso premium requerido" }, { status: 403 });
    }

    // Devolver histórico completo
    const snap = await adminDb.collection("eoh").orderBy("periodo_key", "desc").get();
    const historico = snap.docs.map(d => d.data());

    return NextResponse.json({ historico });
  } catch (error) {
    console.error("Firestore error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
