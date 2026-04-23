import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function POST(req: Request) {
  const { email } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    customer_email: email,
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/premium?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}`,
    metadata: { product: "barometro-premium" },
  });

  return NextResponse.json({ url: session.url });
}
