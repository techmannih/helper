import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { assertDefinedOrRaiseNonRetriableError } from "@/inngest/utils";
import { conversationChannelId } from "@/lib/ably/channels";
import { publishToAbly } from "@/lib/ably/client";
import { generateDraftResponse } from "@/lib/ai/generateResponse";
import { getConversationBySlug } from "@/lib/data/conversation";
import { createAiDraft, getLastAiGeneratedDraft, serializeResponseAiDraft } from "@/lib/data/conversationMessage";
import { getMailboxById } from "@/lib/data/mailbox";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";

export const refreshConversationDraft = async (conversationSlug: string) => {
  const conversation = assertDefinedOrRaiseNonRetriableError(await getConversationBySlug(conversationSlug));
  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(conversation.mailboxId));
  const lastUserMessage = assertDefinedOrRaiseNonRetriableError(
    await db.query.conversationMessages.findFirst({
      where: and(eq(conversationMessages.conversationId, conversation.id), eq(conversationMessages.role, "user")),
      orderBy: desc(conversationMessages.createdAt),
      with: {
        conversation: {
          columns: {
            subject: true,
          },
        },
      },
    }),
  );
  const metadata: object = lastUserMessage?.metadata ?? {};
  const channel = conversationChannelId(mailbox.slug, conversationSlug);

  try {
    const oldDraft = await getLastAiGeneratedDraft(conversation.id);
    const { draftResponse, promptInfo } = await generateDraftResponse(
      conversation.mailboxId,
      lastUserMessage,
      metadata,
    );

    const newDraft = await db.transaction(async (tx) => {
      if (oldDraft) {
        await tx
          .update(conversationMessages)
          .set({ status: "discarded" })
          .where(eq(conversationMessages.id, oldDraft.id));
      }
      return await createAiDraft(conversation.id, draftResponse, lastUserMessage.id, promptInfo, tx);
    });

    await publishToAbly({ channel, event: "draft.updated", data: serializeResponseAiDraft(newDraft, mailbox) });
  } catch (error) {
    captureExceptionAndThrowIfDevelopment(error);
    await publishToAbly({ channel, event: "draft.error", data: "refresh ai draft failed" });
  }
};

export default inngest.createFunction(
  { id: "refresh-conversation-draft" },
  { event: "conversations/draft.refresh" },
  async ({ event, step }) => {
    const { conversationSlug } = event.data;

    await step.run("refresh", () => refreshConversationDraft(conversationSlug));

    return { message: `Draft for conversation ${conversationSlug} generated successfully` };
  },
);
