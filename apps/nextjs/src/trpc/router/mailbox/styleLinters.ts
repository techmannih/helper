import { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { styleLinters } from "@/db/schema";
import { resetMailboxPromptUpdatedAt } from "@/lib/data/mailbox";
import { setPrivateMetadata } from "@/lib/data/organization";
import { mailboxProcedure } from "./procedure";

export const styleLintersRouter = {
  list: mailboxProcedure.query(async ({ ctx }) => {
    return await db
      .select({
        id: styleLinters.id,
        before: styleLinters.before,
        after: styleLinters.after,
      })
      .from(styleLinters)
      .where(eq(styleLinters.clerkOrganizationId, ctx.mailbox.clerkOrganizationId));
  }),
  setEnabled: mailboxProcedure
    .input(
      z.object({
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input: { enabled }, ctx }) => {
      await setPrivateMetadata(ctx.mailbox.clerkOrganizationId, { isStyleLinterEnabled: enabled });
      await db.transaction((tx) => resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id));
    }),
} satisfies TRPCRouterRecord;
