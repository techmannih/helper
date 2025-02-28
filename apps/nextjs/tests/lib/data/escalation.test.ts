import { conversationFactory } from "@tests/support/factories/conversations";
import { escalationFactory } from "@tests/support/factories/escalations";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { escalations } from "@/db/schema/escalations";
import { getConversationById } from "@/lib/data/conversation";
import { getActiveEscalation, postEscalationMessage, resolveEscalation } from "@/lib/data/escalation";
import * as userModule from "@/lib/data/user";
import * as slackClient from "@/lib/slack/client";

const updateSlackMessage = vi.spyOn(slackClient, "updateSlackMessage").mockImplementation(() => Promise.resolve());
const postSlackMessageMock = vi.spyOn(slackClient, "postSlackMessage").mockResolvedValue("1234567890.123456");

const findUserViaSlackMock = vi.spyOn(userModule, "findUserViaSlack");

vi.mock("@/lib/data/conversationMessage", () => ({
  createReply: vi.fn(),
  getLastAiGeneratedDraft: vi.fn(),
  bodyWithSignature: vi.fn(),
  ensureCleanedUpText: vi.fn(),
}));

vi.mock("@/lib/data/note", () => ({
  addNote: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({
  runAIQuery: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

afterEach(() => {
  updateSlackMessage.mockClear();
  findUserViaSlackMock.mockReset();
});

describe("getActiveEscalation", () => {
  it("returns the active escalation for a conversation", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { escalation } = await escalationFactory.create(conversation.id);

    const activeEscalation = await getActiveEscalation(conversation.id);

    expect(activeEscalation).toMatchObject({
      id: escalation.id,
      conversationId: conversation.id,
      resolvedAt: null,
    });
  });

  it("returns null if there's no active escalation", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const activeEscalation = await getActiveEscalation(conversation.id);

    expect(activeEscalation).toBeNull();
  });

  it("returns the most recent active escalation if there are multiple", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    await escalationFactory.create(conversation.id, { createdAt: new Date("2023-01-01") });
    const { escalation: recentEscalation } = await escalationFactory.create(conversation.id, {
      createdAt: new Date("2023-01-02"),
    });

    const activeEscalation = await getActiveEscalation(conversation.id);

    expect(activeEscalation).toMatchObject({
      id: recentEscalation.id,
      conversationId: conversation.id,
      resolvedAt: null,
    });
  });
});

describe("postEscalationMessage", () => {
  it("posts a message to Slack and updates the escalation", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: { slackBotToken: "xoxb-12345678901234567890" },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { escalation } = await escalationFactory.create(conversation.id, {
      slackChannel: "C12345",
    });

    postSlackMessageMock.mockResolvedValueOnce("1234567890.123456");

    await postEscalationMessage({
      ...escalation,
      conversation: { ...conversation, mailbox },
    });

    expect(postSlackMessageMock).toHaveBeenCalledWith("xoxb-12345678901234567890", {
      channel: "C12345",
      attachments: expect.arrayContaining([
        expect.objectContaining({
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: "actions",
              block_id: "escalation_actions",
            }),
          ]),
        }),
      ]),
    });

    const updatedEscalation = await db.query.escalations.findFirst({
      where: eq(escalations.id, escalation.id),
    });

    expect(updatedEscalation?.slackMessageTs).toBe("1234567890.123456");
  });

  it("throws an error if the escalation is not linked to Slack", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: { slackBotToken: "xoxb-12345678901234567890" },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { escalation } = await escalationFactory.create(conversation.id, { slackChannel: null });

    await expect(
      postEscalationMessage({
        ...escalation,
        conversation: { ...conversation, mailbox },
      }),
    ).rejects.toThrow("Escalation is not linked to Slack");
  });

  it("throws an error if the mailbox is not linked to Slack", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { escalation } = await escalationFactory.create(conversation.id, {
      slackChannel: "C12345",
    });

    await expect(
      postEscalationMessage({
        ...escalation,
        conversation: { ...conversation, mailbox },
      }),
    ).rejects.toThrow("Mailbox is not linked to Slack");
  });
});

describe("resolveEscalation", () => {
  it("resolves an escalation", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { escalation } = await escalationFactory.create(conversation.id);

    await resolveEscalation({ escalation, user, email: true, closed: true });

    const updatedEscalation = await db.query.escalations.findFirst({
      where: eq(escalations.id, escalation.id),
    });

    expect(updatedEscalation?.resolvedAt).toBeTruthy();
  });

  it("updates the conversation status to open when not closed", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { status: "escalated" });
    const { escalation } = await escalationFactory.create(conversation.id);

    await resolveEscalation({ escalation, user, email: true, closed: false });

    const updatedConversation = await getConversationById(conversation.id);
    expect(updatedConversation?.status).toBe("open");
  });

  it("keeps the conversation status closed when closed", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { status: "closed" });
    const { escalation } = await escalationFactory.create(conversation.id);

    await resolveEscalation({ escalation, user, email: true, closed: true });

    const updatedConversation = await getConversationById(conversation.id);
    expect(updatedConversation?.status).toBe("closed");
  });

  it("updates the Slack message", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      mailboxOverrides: { slackBotToken: "xoxb-12345678901234567890" },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { escalation } = await escalationFactory.create(conversation.id, {
      slackChannel: "C12345",
      slackMessageTs: "1234567890.123456",
    });

    await resolveEscalation({ escalation, user, email: true, closed: true });

    expect(updateSlackMessage).toHaveBeenCalledWith({
      token: "xoxb-12345678901234567890",
      channel: "C12345",
      ts: "1234567890.123456",
      attachments: expect.arrayContaining([
        expect.objectContaining({
          blocks: expect.arrayContaining([
            {
              elements: [
                {
                  text: `Closed with reply by ${user.fullName}`,
                  type: "mrkdwn",
                },
              ],
              type: "context",
            },
          ]),
        }),
      ]),
    });
  });
});
