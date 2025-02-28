import { conversationMessages, conversations, mailboxes, workflowConditions } from "@/db/schema";
import {
  WorkflowConditionField,
  WorkflowConditionFieldType,
  WorkflowConditionOperator,
} from "@/db/schema/workflowConditions";
import { GPT_4O_MINI_MODEL, isWithinTokenLimit } from "@/lib/ai/core";
import { runAIQuery } from "../ai";
import { getMailboxById } from "./mailbox";

type MessageWithConversation = typeof conversationMessages.$inferSelect & {
  conversation: typeof conversations.$inferSelect;
};

export async function evaluateFreeformWorkflow(
  condition: string,
  emailContent: string,
  mailbox: typeof mailboxes.$inferSelect,
): Promise<boolean> {
  const systemPrompt = `Respond with TRUE or FALSE if the following statement accurately describes the user email we received. Do not respond with anything else. If the answer is unclear, respond with FALSE:
Statement: ${condition}`;
  const userPrompt = emailContent;

  if (!isWithinTokenLimit(systemPrompt + userPrompt)) {
    console.log("Prompt exceeds the token limit");
    return false;
  }

  const answer = await runAIQuery({
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    mailbox,
    queryType: "freeform_workflow",
    model: GPT_4O_MINI_MODEL,
    functionId: "evaluate-freeform-workflow",
  });
  if (answer !== "TRUE" && answer !== "FALSE") {
    console.error(`AI failed to output a binary answer: ${answer}`);
    return false;
  }
  return answer === "TRUE";
}

export async function evaluateWorkflowCondition(
  condition: Pick<typeof workflowConditions.$inferSelect, "operator" | "field" | "value">,
  message: MessageWithConversation,
): Promise<boolean> {
  const targetValue = getValue(condition.field, message);

  if (typeof targetValue === "string" && condition.operator === WorkflowConditionOperator.PASSES_AI_CONDITIONAL_FOR) {
    const mailbox = await getMailboxById(message.conversation.mailboxId);
    if (!mailbox) throw new Error(`Mailbox not found for conversation ${message.conversation.id}`);
    return evaluateFreeformWorkflow(condition.value, targetValue, mailbox);
  }

  throw new Error(
    `Unknown operator '${condition.operator}': ${JSON.stringify({ targetValue, conditionValue: condition.value })}`,
  );
}

function getValue(field: WorkflowConditionFieldType, message: MessageWithConversation): string | string[] {
  switch (field) {
    case WorkflowConditionField.FULL_EMAIL_CONTEXT:
      return [
        `Email address: ${getValue(WorkflowConditionField.EMAIL, message)}`,
        `Subject: ${getValue(WorkflowConditionField.SUBJECT, message)}`,
        `CC: ${getValue(WorkflowConditionField.CC, message)}`,
        `Email:\n${getValue(WorkflowConditionField.QUESTION, message)}`,
      ].join("\n");
    case WorkflowConditionField.CC:
      return message.emailCc || "(no cc'd emails)";
    case WorkflowConditionField.STATUS:
      return message.conversation.status || "(no status)";
    case WorkflowConditionField.SUBJECT:
      return message.conversation.subject || "(no subject)";
    case WorkflowConditionField.EMAIL:
      return message.emailFrom || "(no email address)";
    case WorkflowConditionField.QUESTION:
      return message.cleanedUpText || "(no email body)";
    default:
      throw new Error(`Unknown field '${field}'`);
  }
}
