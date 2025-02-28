"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DataError } from "@/lib/data/dataError";
import {
  createMailboxMetadataApi,
  deleteMailboxMetadataApiByMailboxSlug,
  testMailboxMetadataApiURL,
} from "@/lib/data/mailboxMetadataApi";
import { mailboxProcedureAction } from "@/trpc/serverActions";

const errorResponse = (genericMessage: string, e?: unknown) => {
  return { error: e instanceof DataError ? e.message : genericMessage };
};

export const createEndpoint = mailboxProcedureAction
  .input(z.object({ url: z.string().url() }))
  .mutation(async ({ ctx, input: { url } }) => {
    try {
      await createMailboxMetadataApi(ctx.mailbox.slug, { url });
      revalidatePath(`/mailboxes/${ctx.mailbox.slug}/settings/`);
    } catch (e) {
      return errorResponse("Error adding metadata endpoint", e);
    }
  });

export const deleteEndpoint = mailboxProcedureAction.mutation(async ({ ctx }) => {
  try {
    await deleteMailboxMetadataApiByMailboxSlug(ctx.mailbox.slug);
    revalidatePath(`/mailboxes/${ctx.mailbox.slug}/settings/`);
  } catch (e) {
    return errorResponse("Error deleting metadata endpoint", e);
  }
});

export const testEndpoint = mailboxProcedureAction.query(async ({ ctx }) => {
  try {
    await testMailboxMetadataApiURL(ctx.mailbox.slug);
  } catch (e) {
    return errorResponse("Error testing metadata endpoint", e);
  }
});
