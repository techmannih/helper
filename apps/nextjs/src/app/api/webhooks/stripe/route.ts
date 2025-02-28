import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { inngest } from "@/inngest/client";
import { ALLOWED_STRIPE_EVENTS } from "@/inngest/functions/handleStripeWebhookEvent";
import { stripe } from "@/lib/stripe/client";

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("Stripe-Signature")!;

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    if (ALLOWED_STRIPE_EVENTS.includes(event.type)) {
      await inngest.send({
        name: "stripe/webhook",
        data: {
          stripeEvent: event,
        },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return new NextResponse(null, { status: 400 });
  }
}
