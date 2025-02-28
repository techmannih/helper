import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, escalations } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { generateConversationSummary } from "@/lib/ai/generateConversationSummary";
import { postEscalationMessage } from "@/lib/data/escalation";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

export const notifySlackEscalation = async (escalationId: number) => {
  const escalation = assertDefinedOrRaiseNonRetriableError(
    await db.query.escalations.findFirst({
      where: eq(escalations.id, escalationId),
      with: {
        conversation: { with: { mailbox: true } },
      },
    }),
  );

  if (escalation.resolvedAt) return "Not posted, already resolved";
  if (!escalation.conversation.mailbox.slackBotToken) return "Not posted, mailbox not linked to Slack";
  await generateConversationSummary(escalation.conversation.id, { force: true });

  const updatedConversation = assertDefinedOrRaiseNonRetriableError(
    await db.query.conversations.findFirst({
      where: eq(conversations.id, escalation.conversationId),
      with: { mailbox: true },
    }),
  );

  const escalationWithSummary = {
    ...escalation,
    conversation: updatedConversation,
  };

  await postEscalationMessage(escalationWithSummary);
  return "Posted";
};

export default inngest.createFunction(
  { id: "post-escalation-to-slack" },
  { event: "conversations/escalation.created" },
  async ({ event, step }) => {
    const {
      data: { escalationId },
    } = event;

    await step.run("handle", async () => {
      const message = await notifySlackEscalation(escalationId);
      return `Escalation ${escalationId}: ${message}`;
    });
  },
);
