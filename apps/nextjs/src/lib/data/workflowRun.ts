import { eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import {
  conversationMessages,
  conversations,
  mailboxes,
  workflowActions,
  workflowRunActions,
  workflowRuns,
  workflows,
} from "@/db/schema";

export const trackWorkflowRun = async (
  workflow: typeof workflows.$inferSelect,
  message: typeof conversationMessages.$inferSelect,
) => {
  const actions = await db.query.workflowActions.findMany({
    where: eq(workflowActions.workflowId, workflow.id),
  });
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, message.conversationId),
  });
  if (!conversation) throw new Error("Conversation not found");

  const mailbox = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.id, conversation.mailboxId),
  });
  if (!mailbox) throw new Error("Mailbox not found");

  const workflowConditionGroups = await db.query.workflowConditionGroups.findMany({
    where: (workflowConditionGroups, { eq }) => eq(workflowConditionGroups.workflowId, workflow.id),
    with: {
      conds: true,
    },
  });

  return await db.transaction(async (tx) => {
    const workflowRun = await tx
      .insert(workflowRuns)
      .values({
        workflowInfo: {
          name: workflow.name,
          order: workflow.order,
          description: workflow.description,
          workflow_type: workflow.workflowType,
          run_on_replies: workflow.runOnReplies,
          auto_reply_from_metadata: workflow.autoReplyFromMetadata,
        },
        workflowConditions: workflowConditionGroups.map((group) => ({
          workflow_conditions: group.conds,
        })),
        conversationId: conversation.id,
        messageId: message.id,
        mailboxId: mailbox.id,
        workflowId: workflow.id,
      })
      .returning()
      .then(takeUniqueOrThrow);

    await Promise.all(
      actions.map((action) =>
        tx.insert(workflowRunActions).values({
          workflowRunId: workflowRun.id,
          actionType: action.actionType,
          actionValue: action.actionValue,
        }),
      ),
    );

    return workflowRun;
  });
};
