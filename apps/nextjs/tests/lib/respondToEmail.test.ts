import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { workflowFactory } from "@tests/support/factories/workflows";
import { mockInngest } from "@tests/support/inngestUtils";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes, messageNotifications } from "@/db/schema";
import * as conversationMessagesDataModule from "@/lib/data/conversationMessage";
import { fetchMetadata } from "@/lib/data/retrieval";
import { executeWorkflowActions } from "@/lib/data/workflow";
import { evaluateWorkflowCondition } from "@/lib/data/workflowCondition";
import { respondToEmail } from "@/lib/respondToEmail";

vi.mock("@/lib/data/workflow", () => ({
  executeWorkflowActions: vi.fn().mockResolvedValue(true),
  getWorkflowPrompt: vi.fn().mockResolvedValue("prompt"),
}));

vi.mock("@/lib/data/workflowCondition", () => ({
  evaluateWorkflowCondition: vi.fn(),
}));

vi.mock("@/lib/data/retrieval", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/data/retrieval")>();
  return {
    ...mod,
    fetchMetadata: vi.fn().mockResolvedValue({ prompt: "prompt", metadata: { name: "John Doe", value: 123 } }),
  };
});

vi.mock("@/emails/autoReply", () => ({
  default: vi.fn().mockReturnValue("Mock auto reply email component"),
}));

vi.mock("@/lib/resend/client", () => ({
  sendEmail: vi.fn(),
}));

const inngestMock = mockInngest();

beforeEach(() => {
  vi.clearAllMocks();
});

const createConversationWithUserEmail = async ({
  conversationOverrides,
}: {
  conversationOverrides?: Partial<typeof conversations.$inferInsert>;
}) => {
  const { mailbox } = await userFactory.createRootUser();
  const { conversation } = await conversationFactory.create(mailbox.id, conversationOverrides);
  const email = await conversationFactory.createUserEmail(conversation.id);

  return { conversation, email, mailbox };
};

describe("respondToEmail", () => {
  it("short-circuits for emails on spam conversations", async () => {
    vi.spyOn(conversationMessagesDataModule, "ensureCleanedUpText");
    const { email } = await createConversationWithUserEmail({
      conversationOverrides: { status: "spam" },
    });

    await respondToEmail(email.id);

    expect(conversationMessagesDataModule.ensureCleanedUpText).not.toHaveBeenCalled();
    expect(fetchMetadata).not.toHaveBeenCalled();
  });

  it("executes workflows in order and short-circuits if a workflow successfully executes on the email", async () => {
    vi.mocked(evaluateWorkflowCondition).mockImplementationOnce(() => Promise.resolve(true));

    const { email, mailbox } = await createConversationWithUserEmail({});
    const workflow2 = await workflowFactory.create(mailbox.id, { order: 2 });
    const workflow1 = await workflowFactory.create(mailbox.id, { order: 1 });
    await workflowFactory.create(mailbox.id, { order: 0, deletedAt: new Date() });

    await respondToEmail(email.id);

    expect(fetchMetadata).toHaveBeenCalledWith(email.emailFrom, mailbox.slug);
    expect(executeWorkflowActions).toHaveBeenCalledWith(
      expect.objectContaining({ id: workflow1.id, order: workflow1.order }),
      expect.objectContaining({ id: email.id, emailFrom: email.emailFrom }),
    );
    expect(executeWorkflowActions).toHaveBeenCalledTimes(1);

    vi.mocked(evaluateWorkflowCondition)
      .mockImplementationOnce(() => Promise.resolve(false))
      .mockImplementationOnce(() => Promise.resolve(true));

    await respondToEmail(email.id);

    expect(executeWorkflowActions).toHaveBeenCalledWith(
      expect.objectContaining({ id: workflow2.id, order: workflow2.order }),
      expect.objectContaining({ id: email.id, emailFrom: email.emailFrom }),
    );
    expect(executeWorkflowActions).toHaveBeenCalledTimes(2);
    const updatedEmail = await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, email.id),
    });
    expect(updatedEmail?.metadata).toEqual({ metadata: { name: "John Doe", value: 123 }, prompt: "prompt" });
  });

  it("enqueues auto response creation when autoRespondEmailToChat is enabled", async () => {
    vi.mocked(evaluateWorkflowCondition).mockImplementation(() => Promise.resolve(false));

    const { email, mailbox } = await createConversationWithUserEmail({});
    await db
      .update(mailboxes)
      .set({
        autoRespondEmailToChat: true,
        widgetHost: "https://widget.example.com",
      })
      .where(eq(mailboxes.id, mailbox.id));

    await respondToEmail(email.id);

    expect(inngestMock.send).toHaveBeenCalledWith({
      name: "conversations/auto-response.create",
      data: { messageId: email.id },
    });
  });

  it("does not enqueue auto response when autoRespondEmailToChat is disabled", async () => {
    vi.mocked(evaluateWorkflowCondition).mockImplementation(() => Promise.resolve(false));

    const { email, mailbox } = await createConversationWithUserEmail({});
    await db
      .update(mailboxes)
      .set({
        autoRespondEmailToChat: false,
        widgetHost: null,
      })
      .where(eq(mailboxes.id, mailbox.id));

    await respondToEmail(email.id);

    expect(inngestMock.send).not.toHaveBeenCalledWith({
      name: "conversations/auto-response.create",
      data: { messageId: email.id },
    });
  });

  it("does not enqueue auto response when workflow runs successfully", async () => {
    vi.mocked(evaluateWorkflowCondition).mockImplementation(() => Promise.resolve(true));

    const { email, mailbox } = await createConversationWithUserEmail({});
    await db
      .update(mailboxes)
      .set({
        autoRespondEmailToChat: true,
        widgetHost: "https://widget.example.com",
      })
      .where(eq(mailboxes.id, mailbox.id));

    const workflow = await workflowFactory.create(mailbox.id);

    await respondToEmail(email.id);

    expect(executeWorkflowActions).toHaveBeenCalledWith(
      expect.objectContaining({ id: workflow.id }),
      expect.objectContaining({ id: email.id }),
    );
    expect(inngestMock.send).not.toHaveBeenCalled();
  });

  it("does not enqueue auto response for follow-up messages", async () => {
    vi.mocked(evaluateWorkflowCondition).mockImplementation(() => Promise.resolve(false));

    const { email, mailbox, conversation } = await createConversationWithUserEmail({});
    await db
      .update(mailboxes)
      .set({
        autoRespondEmailToChat: true,
        widgetHost: "https://widget.example.com",
      })
      .where(eq(mailboxes.id, mailbox.id));

    // Create an additional message to make this a follow-up
    await conversationFactory.createUserEmail(conversation.id);

    await respondToEmail(email.id);

    expect(inngestMock.send).not.toHaveBeenCalledWith({
      name: "conversations/auto-response.create",
    });
  });
});
