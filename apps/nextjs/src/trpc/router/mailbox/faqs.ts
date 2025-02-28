import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversationMessages, faqs } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { resetMailboxPromptUpdatedAt } from "@/lib/data/mailbox";
import { mailboxProcedure } from "./procedure";

export const faqsRouter = {
  list: mailboxProcedure.query(async ({ ctx }) => {
    return await db
      .select({
        id: faqs.id,
        body: faqs.body,
        question: faqs.question,
        reply: faqs.reply,
        mailboxId: faqs.mailboxId,
        messageId: faqs.messageId,
        createdAt: faqs.createdAt,
        updatedAt: faqs.updatedAt,
      })
      .from(faqs)
      .where(eq(faqs.mailboxId, ctx.mailbox.id));
  }),
  upsert: mailboxProcedure
    .input(
      z.object({
        id: z.number().optional(),
        question: z.string(),
        reply: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await db.transaction(async (tx) => {
        const { mailboxSlug: _, id, ...values } = input;

        const faq = id
          ? await tx
              .update(faqs)
              .set(values)
              .where(and(eq(faqs.id, id), eq(faqs.mailboxId, ctx.mailbox.id)))
              .returning()
              .then(takeUniqueOrThrow)
          : await tx
              .insert(faqs)
              .values({
                mailboxId: ctx.mailbox.id,
                body: "",
                ...values,
              })
              .returning()
              .then(takeUniqueOrThrow);
        await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);

        inngest.send({
          name: "faqs/embedding.create",
          data: { faqId: faq.id },
        });

        return faq;
      });
    }),
  delete: mailboxProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    return await db.transaction(async (tx) => {
      const [faq] = await tx
        .select()
        .from(faqs)
        .where(and(eq(faqs.id, input.id), eq(faqs.mailboxId, ctx.mailbox.id)))
        .limit(1);
      if (!faq) {
        throw new TRPCError({ code: "NOT_FOUND", message: "FAQ not found" });
      }

      await tx.delete(faqs).where(eq(faqs.id, faq.id));
      if (faq.messageId) {
        await tx
          .update(conversationMessages)
          .set({ isPinned: false })
          .where(eq(conversationMessages.id, faq.messageId));
      }

      await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);
    });
  }),
} satisfies TRPCRouterRecord;
