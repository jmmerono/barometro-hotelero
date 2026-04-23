import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) return NextResponse.json({ premium: false });

  const snap = await getDoc(doc(db, "premium_users", email));
  if (snap.exists() && snap.data().active) {
    return NextResponse.json({ premium: true });
  }

  return NextResponse.json({ premium: false });
}
