import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { doc, getDoc } from "firebase/firestore";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  // Verificar acceso premium
  if (!email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const snap = await getDoc(doc(db, "premium_users", email));
  if (!snap.exists() || !snap.data().active) {
    return NextResponse.json({ error: "Acceso premium requerido" }, { status: 403 });
  }

  // Devolver histórico completo
  const q = query(collection(db, "eoh"), orderBy("periodo", "desc"));
  const docs = await getDocs(q);
  const historico = docs.docs.map(d => d.data());

  return NextResponse.json({ historico });
}
