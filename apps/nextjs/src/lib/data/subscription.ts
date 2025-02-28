import { eq } from "drizzle-orm";
import { getBaseUrl, HELPER_SUPPORT_EMAIL_FROM, SUBSCRIPTION_FLAT_FEE_USAGE_LIMIT } from "@/components/constants";
import { db } from "@/db/client";
import { gmailSupportEmails, subscriptions } from "@/db/schema";
import { env } from "@/env";
import { stripe } from "@/lib/stripe/client";
import { captureExceptionAndThrowIfDevelopment } from "../shared/sentry";

export const createStripeCheckoutSessionUrl = async ({
  gmailSupportEmailId,
  slug: mailboxSlug,
  clerkOrganizationId,
}: {
  gmailSupportEmailId: number | null;
  slug: string;
  clerkOrganizationId: string;
}) => {
  const email = gmailSupportEmailId
    ? (
        await db.query.gmailSupportEmails.findFirst({
          where: eq(gmailSupportEmails.id, gmailSupportEmailId),
          columns: {
            email: true,
          },
        })
      )?.email
    : undefined;

  const baseSettingsUrl = new URL(`/mailboxes/${mailboxSlug}/settings`, new URL(getBaseUrl()).origin);
  baseSettingsUrl.searchParams.set("tab", "billing");

  const successUrl = new URL(baseSettingsUrl);
  successUrl.searchParams.set("stripeStatus", "success");

  const stripeSession = await stripe.checkout.sessions.create({
    client_reference_id: clerkOrganizationId,
    mode: "subscription",
    line_items: [
      {
        price: env.STRIPE_FIXED_PRICE_ID,
        quantity: SUBSCRIPTION_FLAT_FEE_USAGE_LIMIT,
      },
      {
        price: env.STRIPE_GRADUATED_PRICE_ID,
      },
    ],
    success_url: `${successUrl.toString()}&stripeSessionId={CHECKOUT_SESSION_ID}`,
    cancel_url: baseSettingsUrl.toString(),
    customer_email: email,
  });

  return stripeSession.url;
};

export const cancelStripeSubscription = async (clerkOrganizationId: string) => {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.clerkOrganizationId, clerkOrganizationId),
    columns: {
      stripeSubscriptionId: true,
    },
  });
  if (!subscription?.stripeSubscriptionId) return { success: false, message: "Subscription does not exist." };

  try {
    const stripeSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    if (stripeSubscription.cancel_at_period_end) {
      return {
        success: true,
        message: "Successfully unsubscribed. Your subscription will end after the current billing period.",
      };
    }
    return {
      success: false,
      message: "Failed to unsubscribe. Please try again later.",
    };
  } catch (error) {
    console.error("Error unsubscribing:", error);
    return {
      success: false,
      message: `An error occurred while unsubscribing. Please contact ${HELPER_SUPPORT_EMAIL_FROM}`,
    };
  }
};

export const getCurrentBillingPeriodUsage = async (stripeCustomerId: string) => {
  const upcomingInvoice = await stripe.invoices.retrieveUpcoming({ customer: stripeCustomerId });
  const totalUsage = upcomingInvoice.lines.data.reduce((sum, lineItem) => {
    if (lineItem.price?.recurring?.usage_type === "metered") {
      return sum + (lineItem.quantity ?? 0);
    }
    return sum;
  }, 0);
  return totalUsage;
};

export const isBillable = async (subscription: typeof subscriptions.$inferSelect) => {
  if (!subscription.stripeCustomerId) return false;
  const hasTimeRemaining = subscription.currentPeriodEnd ? subscription.currentPeriodEnd > new Date() : true;
  if (!hasTimeRemaining) {
    return false;
  } else if (subscription.canceledAt) {
    const currentUsage = await getCurrentBillingPeriodUsage(subscription.stripeCustomerId);
    if (currentUsage >= SUBSCRIPTION_FLAT_FEE_USAGE_LIMIT) {
      return false;
    }
  }
  return true;
};

export const billWorkflowReply = async (emailId: number, organizationId: string) => {
  try {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.clerkOrganizationId, organizationId),
      columns: {
        stripeCustomerId: true,
      },
    });

    if (!subscription?.stripeCustomerId) {
      throw new Error(`Stripe customer ID not found for organization ${organizationId}`);
    }

    await stripe.billing.meterEvents.create({
      event_name: "automated_replies",
      identifier: `automated_reply_${emailId}_${Math.floor(Date.now() / 1000)}`,
      payload: { value: "1", stripe_customer_id: subscription.stripeCustomerId },
    });
  } catch (error) {
    captureExceptionAndThrowIfDevelopment(error);
  }
};
