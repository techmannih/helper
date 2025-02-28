"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/trpc/server";

export const updatePromptLines = async ({
  mailboxSlug,
  responseGeneratorPrompt,
}: {
  mailboxSlug: string;
  responseGeneratorPrompt: string[];
}) => {
  await api.mailbox.update({ mailboxSlug, responseGeneratorPrompt });
  revalidatePath(`/mailboxes/${mailboxSlug}/settings`);
};
