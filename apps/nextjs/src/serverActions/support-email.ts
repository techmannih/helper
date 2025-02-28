"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/trpc/server";

// eslint-disable-next-line require-await
export async function authorizeGmailAccount(mailbox_slug: string) {
  return redirect(`/api/connect/google?mailbox=${mailbox_slug}`);
}

export async function disconnectSupportEmail(mailbox_slug: string) {
  await api.gmailSupportEmail.delete({ mailboxSlug: mailbox_slug });
  revalidatePath(`/mailboxes/${mailbox_slug}/settings`);
}
