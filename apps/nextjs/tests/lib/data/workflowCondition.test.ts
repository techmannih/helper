import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { conversationMessages, WorkflowConditionFieldType, WorkflowConditionOperatorType } from "@/db/schema";
import { runAIQuery } from "@/lib/ai";
import { Conversation } from "@/lib/data/conversation";
import { Mailbox } from "@/lib/data/mailbox";
import { evaluateWorkflowCondition } from "@/lib/data/workflowCondition";

vi.mock("@/lib/ai", async (importOriginal) => ({
  ...(await importOriginal()),
  runAIQuery: vi.fn(),
}));

describe("evaluateWorkflowCondition", () => {
  let mailbox: Mailbox;
  let conversation: Conversation;
  let message: typeof conversationMessages.$inferSelect;
  let messageWithConversation: typeof conversationMessages.$inferSelect & { conversation: Conversation };

  beforeEach(async () => {
    vi.clearAllMocks();
    mailbox = (await userFactory.createRootUser()).mailbox;
    conversation = (await conversationFactory.create(mailbox.id)).conversation;
    message = (await conversationMessagesFactory.create(conversation.id)).message;
    messageWithConversation = { ...message, conversation };
  });

  it("returns true for a valid condition", async () => {
    const condition = {
      field: "full_email_context" as WorkflowConditionFieldType,
      operator: "passes AI conditional for" as WorkflowConditionOperatorType,
      value: "email is from user@example.com",
    };
    vi.mocked(runAIQuery).mockResolvedValueOnce("TRUE");

    const result = await evaluateWorkflowCondition(condition, messageWithConversation);
    expect(result).toBe(true);
    expect(runAIQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryType: "freeform_workflow",
      }),
    );
  });

  it("returns false for an invalid condition", async () => {
    const condition = {
      field: "full_email_context" as WorkflowConditionFieldType,
      operator: "passes AI conditional for" as WorkflowConditionOperatorType,
      value: "email is from user@example.com",
    };
    vi.mocked(runAIQuery).mockResolvedValueOnce("FALSE");

    const result = await evaluateWorkflowCondition(condition, messageWithConversation);
    expect(result).toBe(false);
  });

  it("throws an error for unknown operator", async () => {
    const condition = {
      field: "subject" as WorkflowConditionFieldType,
      operator: "unknown_operator" as any,
      value: "Test Subject",
    };

    await expect(evaluateWorkflowCondition(condition, messageWithConversation)).rejects.toThrow(
      "Unknown operator 'unknown_operator'",
    );
  });
});
