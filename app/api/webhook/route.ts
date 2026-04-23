import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Webhook signature invalid" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_email;
    const customerId = session.customer as string;

    if (email) {
      await setDoc(doc(db, "premium_users", email), {
        email,
        customerId,
        subscriptionId: session.subscription,
        activatedAt: new Date().toISOString(),
        active: true,
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
    if (customer.email) {
      await setDoc(doc(db, "premium_users", customer.email), {
        active: false,
      }, { merge: true });
    }
  }

  return NextResponse.json({ received: true });
}
