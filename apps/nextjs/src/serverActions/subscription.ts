"use server";

import { redirect } from "next/navigation";
import { cancelStripeSubscription, createStripeCheckoutSessionUrl } from "@/lib/data/subscription";
import { stripe } from "@/lib/stripe/client";
import { mailboxProcedureAction } from "@/trpc/serverActions";

export async function handleSuccessfulSubscription(session_id: string): Promise<{ success: boolean; message: string }> {
  const error_message = "Payment cannot be verified at the moment, please check after 10 minutes.";

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const isPaid = session.payment_status === "paid";
    return {
      success: isPaid,
      message: isPaid ? "Successfully subscribed to Helper" : error_message,
    };
  } catch (error) {
    console.error("Error retrieving Stripe session:", error);
    return {
      success: false,
      message: error_message,
    };
  }
}

export const subscribeToHelper = mailboxProcedureAction.mutation(async ({ ctx }) => {
  const stripeCheckoutSessionUrl = await createStripeCheckoutSessionUrl({
    gmailSupportEmailId: ctx.mailbox.gmailSupportEmailId,
    slug: ctx.mailbox.slug,
    clerkOrganizationId: ctx.mailbox.clerkOrganizationId,
  });
  if (stripeCheckoutSessionUrl) return redirect(stripeCheckoutSessionUrl);
  throw new Error("Failed to create Stripe session");
});

export const unsubscribeFromHelper = mailboxProcedureAction.mutation(async ({ ctx }) => {
  const { success, message } = await cancelStripeSubscription(ctx.mailbox.clerkOrganizationId);
  return { success, message };
});
