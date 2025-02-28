"use server";

import { revalidatePath } from "next/cache";
import type { EditableWorkflow } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/automaticWorkflowsSetting";
import { api } from "@/trpc/server";

const settingsRelativePath = (mailboxSlug: string) => `/mailboxes/${mailboxSlug}/settings`;
export const saveWorkflow = async (mailboxSlug: string, workflow: EditableWorkflow) => {
  await api.mailbox.workflows.set({ mailboxSlug, ...workflow });
  revalidatePath(settingsRelativePath(mailboxSlug));
};

export const reorderWorkflows = async (mailboxSlug: string, positions: number[]) => {
  await api.mailbox.workflows.reorder({ mailboxSlug, positions });
  revalidatePath(settingsRelativePath(mailboxSlug));
};
