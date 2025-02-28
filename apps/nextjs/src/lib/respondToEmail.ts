import { and, asc, count, eq, isNull, ne } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, WorkflowConditionField, WorkflowConditionOperator, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { disableAIResponse, ensureCleanedUpText, getTextWithConversationSubject } from "@/lib/data/conversationMessage";
import { getPlatformCustomer, upsertPlatformCustomer } from "@/lib/data/platformCustomer";
import { fetchMetadata } from "@/lib/data/retrieval";
import { executeWorkflowActions, getWorkflowPrompt } from "@/lib/data/workflow";
import { evaluateWorkflowCondition } from "@/lib/data/workflowCondition";

export const respondToEmail = async (messageId: number) => {
  const email = await db.query.conversationMessages
    .findFirst({
      where: eq(conversationMessages.id, messageId),
      with: {
        conversation: {
          with: {
            mailbox: {
              columns: {
                slug: true,
                autoRespondEmailToChat: true,
                widgetHost: true,
                id: true,
                name: true,
                disableAutoResponseForVips: true,
              },
              with: {
                wfs: {
                  where: isNull(workflows.deletedAt),
                  orderBy: [asc(workflows.order), asc(workflows.id)],
                  with: {
                    groups: {
                      with: {
                        conds: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
    .then(assertDefined);
  if (email.conversation.status === "spam") {
    return;
  }

  await ensureCleanedUpText(email);

  const customerMetadata = email.emailFrom
    ? await fetchMetadata(email.emailFrom, email.conversation.mailbox.slug)
    : null;
  if (customerMetadata) {
    await db
      .update(conversationMessages)
      .set({ metadata: customerMetadata ?? null })
      .where(eq(conversationMessages.id, messageId));

    if (email.emailFrom) {
      await upsertPlatformCustomer({
        email: email.emailFrom,
        mailboxId: email.conversation.mailboxId,
        customerMetadata: customerMetadata.metadata,
      });
    }
  }

  const platformCustomer = email.conversation.emailFrom
    ? await getPlatformCustomer(email.conversation.mailboxId, email.conversation.emailFrom)
    : null;

  if (await disableAIResponse(email.conversationId, email.conversation.mailbox, platformCustomer)) {
    return;
  }

  const { count: messageCount } = await db
    .select({ count: count() })
    .from(conversationMessages)
    .where(and(eq(conversationMessages.conversationId, email.conversationId), ne(conversationMessages.status, "draft")))
    .then(takeUniqueOrThrow);
  const isFollowUp = messageCount > 1;

  const workflowRecords = isFollowUp
    ? email.conversation.mailbox.wfs.filter((workflow) => workflow.runOnReplies)
    : email.conversation.mailbox.wfs;
  for (const workflow of workflowRecords) {
    const prompt = getWorkflowPrompt(workflow);
    const condition = {
      operator: WorkflowConditionOperator.PASSES_AI_CONDITIONAL_FOR,
      field: WorkflowConditionField.FULL_EMAIL_CONTEXT,
      value: prompt,
    };
    if (await evaluateWorkflowCondition(condition, email)) {
      await executeWorkflowActions(workflow, email);
      return;
    }
  }

  const emailText = (await getTextWithConversationSubject(email.conversation, email)).trim();
  if (emailText.length === 0) {
    return;
  }

  const { mailbox } = email.conversation;
  const shouldAutoRespond = mailbox.autoRespondEmailToChat && mailbox.widgetHost && !isFollowUp;

  if (shouldAutoRespond) {
    await inngest.send({
      name: "conversations/auto-response.create",
      data: { messageId: email.id },
    });
  }
};
