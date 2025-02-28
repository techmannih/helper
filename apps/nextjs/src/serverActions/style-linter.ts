"use server";

import { TRPCError } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_STYLE_LINTERS } from "@/components/constants";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { styleLinters } from "@/db/schema";
import { resetMailboxPromptUpdatedAt } from "@/lib/data/mailbox";
import { mailboxProcedureAction } from "@/trpc/serverActions";

export const upsertStyleLinter = mailboxProcedureAction
  .input(
    z.object({
      linter: z.object({
        id: z.number().optional(),
        before: z.string(),
        after: z.string(),
      }),
    }),
  )
  .mutation(async ({ ctx, input: { linter } }) => {
    await db.transaction(async (tx) => {
      if (linter.id) {
        await tx
          .update(styleLinters)
          .set({
            before: linter.before,
            after: linter.after,
          })
          .where(
            and(eq(styleLinters.id, linter.id), eq(styleLinters.clerkOrganizationId, ctx.mailbox.clerkOrganizationId)),
          )
          .returning();
      } else {
        const { count: existingLinterCount } = await tx
          .select({ count: count(styleLinters.id) })
          .from(styleLinters)
          .where(eq(styleLinters.clerkOrganizationId, ctx.mailbox.clerkOrganizationId))
          .then(takeUniqueOrThrow);
        if (existingLinterCount >= MAX_STYLE_LINTERS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `You can only have a maximum of ${MAX_STYLE_LINTERS} style linters.`,
          });
        }
        await tx.insert(styleLinters).values({
          clerkOrganizationId: ctx.mailbox.clerkOrganizationId,
          before: linter.before,
          after: linter.after,
        });
      }

      await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);
    });

    revalidatePath(`/mailboxes/${ctx.mailbox.slug}/settings`);
  });

export const deleteStyleLinter = mailboxProcedureAction
  .input(
    z.object({
      id: z.number(),
    }),
  )
  .mutation(async ({ ctx, input: { id } }) => {
    await db.transaction(async (tx) => {
      await tx
        .delete(styleLinters)
        .where(and(eq(styleLinters.id, id), eq(styleLinters.clerkOrganizationId, ctx.mailbox.clerkOrganizationId)));

      await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);
    });

    revalidatePath(`/mailboxes/${ctx.mailbox.slug}/settings`);
  });
