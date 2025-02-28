import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { escalationFactory } from "@tests/support/factories/escalations";
import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notifySlackEscalation } from "@/inngest/functions/postEscalationToSlack";
import { postEscalationMessage } from "@/lib/data/escalation";

vi.mock("@/lib/ai", () => ({
  runAIObjectQuery: vi.fn().mockResolvedValue({ summary: "Test summary" }),
}));

vi.mock("@/lib/data/escalation", () => ({
  postEscalationMessage: vi.fn(),
}));

describe("notifySlackEscalation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts escalation to Slack", async () => {
    const { user, mailbox } = await userFactory.createRootUser({ mailboxOverrides: { slackBotToken: "valid-token" } });
    const { conversation } = await conversationFactory.create(mailbox.id);
    await conversationMessagesFactory.create(conversation.id);
    const { escalation } = await escalationFactory.create(conversation.id, {
      clerkUserId: user.id,
      resolvedAt: null,
    });

    const result = await notifySlackEscalation(escalation.id);

    expect(result).toBe("Posted");
    expect(postEscalationMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: escalation.id,
      }),
    );
  });

  it("does not post when escalation is already resolved", async () => {
    const { user, mailbox } = await userFactory.createRootUser({ mailboxOverrides: { slackBotToken: "valid-token" } });
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { escalation } = await escalationFactory.create(conversation.id, {
      clerkUserId: user.id,
      resolvedAt: new Date(),
    });

    const result = await notifySlackEscalation(escalation.id);

    expect(result).toBe("Not posted, already resolved");
    expect(postEscalationMessage).not.toHaveBeenCalled();
  });

  it("does not post when mailbox is not linked to Slack", async () => {
    const { user, mailbox } = await userFactory.createRootUser({ mailboxOverrides: { slackBotToken: null } });
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { escalation } = await escalationFactory.create(conversation.id, {
      clerkUserId: user.id,
      resolvedAt: null,
    });

    const result = await notifySlackEscalation(escalation.id);

    expect(result).toBe("Not posted, mailbox not linked to Slack");
    expect(postEscalationMessage).not.toHaveBeenCalled();
  });
});
