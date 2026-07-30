import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) return NextResponse.json({ premium: false });

  try {
    const snap = await getAdminDb().collection("premium_users").doc(email).get();
    if (snap.exists && snap.data()?.active) {
      return NextResponse.json({ premium: true });
    }
    return NextResponse.json({ premium: false });
  } catch (error) {
    console.error("Firestore error:", error);
    return NextResponse.json({ premium: false });
  }
}
