"use server";

import { revalidatePath } from "next/cache";
import { RouterInputs } from "@/trpc";
import { api } from "@/trpc/server";

export const updateConversation = async (inputs: RouterInputs["mailbox"]["conversations"]["update"]) => {
  await api.mailbox.conversations.update(inputs);
  revalidatePath("/");
};
